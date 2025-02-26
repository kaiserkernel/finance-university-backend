export const queryByRoleWritter = (role: string, college?: string) => {
    let query: any = {}

    if (role === "grant_dir") query.role = ["grant_dep", "col_dean", "finance"]
    if (role === "col_dean") {
        query.role = ["user", "reviewer"]
        query.college = college
    }

    return query
};
