export default function Link({ href, children, scroll: _s, ...rest }: any) { return <a href={href} {...rest}>{children}</a>; }
