import type { StreamdownProps } from 'streamdown';

import { Streamdown } from 'streamdown';

interface Props extends Pick<StreamdownProps, 'mode'> {
  children: string;
}

export function ChatMessage({ children, mode }: Props) {
  return (
    <article className="self-start rounded-xl bg-secondary p-3">
      <header hidden>
        <strong>John Doe</strong>
        <time datetime="2026-03-22T10:00">10:00</time>
      </header>

      <p>
        <Streamdown animated isAnimating mode={mode}>
          {children}
        </Streamdown>
      </p>
    </article>
  );
}
