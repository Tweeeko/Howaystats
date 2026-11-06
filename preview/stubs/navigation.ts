export const usePathname = () => "/";
export const useRouter = () => ({ refresh() {} });
export const redirect = () => { throw new Error("redirect"); };
export const notFound = () => { throw new Error("notFound"); };
