import { Link, LinkProps, NavLink, NavLinkProps, useNavigate } from 'react-router-dom';
import { MouseEvent } from 'react';
import { navigateWithTransition } from '../lib/viewTransition';

function useTransitionClick(props: LinkProps | NavLinkProps) {
  const navigate = useNavigate();
  return (event: MouseEvent<HTMLAnchorElement>) => {
    props.onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        (props.target && props.target !== '_self') || props.reloadDocument || event.currentTarget.hasAttribute('download')) return;
    event.preventDefault();
    const portrait = event.currentTarget.querySelector<HTMLElement>('[data-transition-portrait] .portrait');
    navigateWithTransition(() => navigate(props.to, {
      replace: props.replace,
      state: props.state,
      relative: props.relative,
      preventScrollReset: props.preventScrollReset,
    }), portrait);
  };
}

export default function TransitionLink(props: LinkProps) {
  const onClick = useTransitionClick(props);
  return <Link {...props} onClick={onClick} />;
}

export function TransitionNavLink(props: NavLinkProps) {
  const onClick = useTransitionClick(props);
  return <NavLink {...props} onClick={onClick} />;
}
