import type { LabelProps } from 'recharts';

export function createConversationsTrendPointLabel(dataLength: number) {
  return function ConversationsTrendPointLabel(props: LabelProps) {
    const { x, y, value, index } = props;
    if (x == null || y == null || value == null || index == null) return null;

    const num = Number(value);
    if (num === 0 && index !== dataLength - 1) return null;

    const text = num.toLocaleString('pt-BR');
    const isLast = index === dataLength - 1;
    const cx = Number(x);
    const cy = Number(y);

    if (isLast) {
      const w = Math.max(36, text.length * 7);
      return (
        <g>
          <rect x={cx - w / 2} y={cy - 32} width={w} height={22} rx={6} fill="var(--color-primary)" />
          <text x={cx} y={cy - 17} textAnchor="middle" fill="var(--color-foreground-inverse)" fontSize={11} fontWeight={600}>
            {text}
          </text>
        </g>
      );
    }

    return (
      <text x={cx} y={cy - 10} textAnchor="middle" fill="var(--color-foreground-icon)" fontSize={10} fontWeight={500}>
        {text}
      </text>
    );
  };
}
