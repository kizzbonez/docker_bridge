import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { buttonClass, type ButtonVariant } from './button-class';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'ghost', className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, className)} {...rest} />;
}

interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant;
}

/** An anchor styled as a button, for in-page navigation and downloads. */
export function LinkButton({ variant = 'ghost', className, children, ...rest }: LinkButtonProps) {
  return (
    <a className={buttonClass(variant, className)} {...rest}>
      {children}
    </a>
  );
}
