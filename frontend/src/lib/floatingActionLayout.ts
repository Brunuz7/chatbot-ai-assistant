/**
 * Espaço no fim do scroll ≈ posição inferior do botão + altura do botão flutuante.
 * Alinhado com ModalFloatingButton (py-2.5, text-sm) e bottom 0.75rem / sm:bottom-4.
 */
export const FLOATING_ACTION_END_SPACER =
  'min-h-[calc(max(0.75rem,env(safe-area-inset-bottom,0px))+2.5rem)] shrink-0 sm:min-h-[calc(1rem+2.5rem)]';

/** Padding inferior em páginas full-layout (ex. editor de fluxos). */
export const FLOATING_ACTION_SCROLL_CLEARANCE =
  'pb-[calc(max(0.75rem,env(safe-area-inset-bottom,0px))+2.5rem)] sm:pb-[calc(1rem+2.5rem)]';
