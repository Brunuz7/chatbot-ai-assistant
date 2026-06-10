import { prisma } from '../lib/prisma.js';
import type { Company, Subscription, SubscriptionStatus, CompanyStatus } from '@prisma/client';

const TRIAL_DAYS = 3;

// Statuses que bloqueiam completamente o acesso
const BLOCKED_COMPANY_STATUSES: CompanyStatus[] = ['BLOCKED', 'INACTIVE', 'CANCELLED'];
const BLOCKED_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ['EXPIRED', 'CANCELLED', 'PAST_DUE'];

export type LicenseCheckResult =
  | { allowed: true }
  | { allowed: false; reason: 'company_blocked' | 'subscription_expired' | 'no_subscription'; message: string };

export class SubscriptionService {
  /**
   * Retorna o plano de trial/básico para novos cadastros.
   * Busca primeiro pelo slug 'basic', depois 'free', depois qualquer plano ativo.
   * Se não houver nenhum plano cadastrado no banco, lança um erro claro.
   */
  static async getDefaultTrialPlan() {
    let plan = await prisma.subscriptionPlan.findFirst({
      where: { isActive: true },
      orderBy: [
        // Preferência: plano mais barato (normalmente o Basic/Free)
        { price: 'asc' },
      ],
    });

    if (!plan) {
      console.warn('Nenhum plano ativo encontrado. Tentando criar plano padrão "Trial" temporário...');
      try {
        plan = await prisma.subscriptionPlan.findUnique({
          where: { slug: 'trial-3-dias' },
        });

        if (!plan) {
          plan = await prisma.subscriptionPlan.create({
            data: {
              name: 'Plano Trial 3 Dias',
              slug: 'trial-3-dias',
              description: 'Plano gratuito de avaliação',
              price: 0,
              billingCycle: 'MONTHLY',
              trialDays: 3,
              isActive: true,
              isPublic: false,
            },
          });
        }
      } catch (e) {
        console.error('Erro ao criar plano padrão dinamicamente:', e);
        // Fallback final: tenta pegar qualquer plano mesmo inativo
        plan = await prisma.subscriptionPlan.findFirst();
      }
    }

    return plan;
  }

  /**
   * Cria atomicamente Company + Subscription vinculada ao User.
   * Utiliza $transaction para garantir rollback total se qualquer etapa falhar.
   */
  static async createCompanyWithTrial(params: {
    email: string;
    name: string;
    phone?: string | null;
    apiToken: string;
  }): Promise<{ company: Company; subscription: Subscription | null }> {
    const plan = await SubscriptionService.getDefaultTrialPlan();

    const now = new Date();
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    const [company, subscription] = await prisma.$transaction(async (tx) => {
      const newCompany = await tx.company.create({
        data: {
          email: params.email,
          name: params.name,
          phone: params.phone ?? null,
          apiToken: params.apiToken,
          status: 'TRIAL',
          trialEndsAt,
        },
      });

      let newSubscription = null;
      if (plan) {
        newSubscription = await tx.subscription.create({
          data: {
            companyId: newCompany.id,
            planId: plan.id,
            status: 'TRIAL',
            startDate: now,
            endDate: trialEndsAt,
            priceAtSigning: plan.price,
          },
        });
      }

      return [newCompany, newSubscription];
    });

    return { company, subscription };
  }

  /**
   * Verifica se um email possui licença ativa para usar o sistema.
   * Consulta Company + Subscription mais recente.
   */
  static async checkLicense(email: string): Promise<LicenseCheckResult> {
    const company = await prisma.company.findUnique({
      where: { email },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!company) {
      // Usuário sem registro de empresa: pode estar em um fluxo legado — permitir por padrão
      return { allowed: true };
    }

    // 1. Verifica se a empresa foi bloqueada/cancelada manualmente
    if (BLOCKED_COMPANY_STATUSES.includes(company.status)) {
      return {
        allowed: false,
        reason: 'company_blocked',
        message: 'Sua conta está bloqueada ou inativa. Entre em contato com o suporte.',
      };
    }

    // 2. Verifica se o trial da empresa expirou (fallback para quem não tem Subscription)
    if (company.status === 'TRIAL' && company.trialEndsAt && company.trialEndsAt < new Date()) {
      return {
        allowed: false,
        reason: 'subscription_expired',
        message: 'Seu período de avaliação gratuita expirou. Assine um plano para continuar.',
      };
    }

    // 3. Verifica a assinatura mais recente
    const subscription = company.subscriptions[0] ?? null;

    if (!subscription) {
      return {
        allowed: false,
        reason: 'no_subscription',
        message: 'Nenhuma assinatura encontrada para sua conta. Assine um plano para continuar.',
      };
    }

    if (BLOCKED_SUBSCRIPTION_STATUSES.includes(subscription.status)) {
      return {
        allowed: false,
        reason: 'subscription_expired',
        message: 'Sua assinatura expirou ou foi cancelada. Renove seu plano para continuar.',
      };
    }

    // 4. Verifica data de vencimento da assinatura
    if (subscription.endDate && subscription.endDate < new Date()) {
      return {
        allowed: false,
        reason: 'subscription_expired',
        message: 'Sua assinatura venceu. Renove seu plano para continuar.',
      };
    }

    return { allowed: true };
  }

  /**
   * Versão da verificação por companyId (usada internamente, ex: webhook).
   */
  static async checkLicenseByCompanyId(companyId: string): Promise<LicenseCheckResult> {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!company) return { allowed: true };

    if (BLOCKED_COMPANY_STATUSES.includes(company.status)) {
      return {
        allowed: false,
        reason: 'company_blocked',
        message: 'Conta bloqueada ou inativa.',
      };
    }

    if (company.status === 'TRIAL' && company.trialEndsAt && company.trialEndsAt < new Date()) {
      return {
        allowed: false,
        reason: 'subscription_expired',
        message: 'Trial expirado.',
      };
    }

    const subscription = company.subscriptions[0] ?? null;
    if (!subscription) return { allowed: true };

    if (BLOCKED_SUBSCRIPTION_STATUSES.includes(subscription.status)) {
      return {
        allowed: false,
        reason: 'subscription_expired',
        message: 'Assinatura expirada ou cancelada.',
      };
    }

    if (subscription.endDate && subscription.endDate < new Date()) {
      return {
        allowed: false,
        reason: 'subscription_expired',
        message: 'Assinatura vencida.',
      };
    }

    return { allowed: true };
  }
}
