'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

import type { InputProps } from '@/components/ui/input';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from './input-group';

function PasswordInput({ ...props }: Readonly<Omit<InputProps, 'type'>>) {
  const [visible, setVisible] = useState(false);

  return (
    <InputGroup>
      <InputGroupInput type={visible ? 'text' : 'password'} {...props} />

      <InputGroupAddon align="inline-end">
        <InputGroupButton
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          size="icon-lg"
          onClick={() => setVisible(!visible)}
        >
          {visible ? <Eye /> : <EyeOff />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

export { PasswordInput };
