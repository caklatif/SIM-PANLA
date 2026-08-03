export const withSemesterBounds = (query: any, start: string | undefined, end: string | undefined) => {
    let q = query;
    if (start) {
        q = q.gte('created_at', `${start}T00:00:00+07:00`);
    }
    if (end) {
        q = q.lte('created_at', `${end}T23:59:59+07:00`);
    }
    return q;
};
