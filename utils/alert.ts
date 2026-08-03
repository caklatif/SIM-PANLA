export let globalShowAlert: (msg: string, title?: string) => Promise<boolean>;
export let globalShowConfirm: (msg: string, title?: string) => Promise<boolean>;

export const showAlert = (msg: string, title?: string) => globalShowAlert?.(msg, title) || Promise.resolve(true);
export const showConfirm = (msg: string, title?: string) => globalShowConfirm?.(msg, title) || Promise.resolve(true);

export const setAlertMethods = (alertFn: any, confirmFn: any) => {
    globalShowAlert = alertFn;
    globalShowConfirm = confirmFn;
};
