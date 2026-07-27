export function notFound() {}

export function permanentRedirect() {}

export function redirect() {}

export function useParams<T = Record<string, string>>() {
  return {} as T;
}

/* Stands in for next/navigation inside the design-sync bundle.
   These hooks read App Router context, which no preview or rendered design
   provides — the real module throws or drags Next server internals in.
   NavLink compares usePathname() against its href, so '/' simply leaves every
   nav item inactive; the active state is exercised by its authored preview. */
export function usePathname() {
  return '/';
}

export function useRouter() {
  return {
    back() {},
    forward() {},
    prefetch() {},
    push() {},
    refresh() {},
    replace() {},
  };
}

export function useSearchParams() {
  return new URLSearchParams();
}

export function useSelectedLayoutSegment(): null | string {
  return null;
}

export function useSelectedLayoutSegments(): string[] {
  return [];
}
