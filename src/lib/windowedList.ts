export const WINDOWED_LIST_VISIBLE_ROWS = 10;
export const WINDOWED_LIST_PAGE_SIZE = 20;
export const WINDOWED_LIST_MAX_RENDERED_ROWS = WINDOWED_LIST_PAGE_SIZE;
export const WINDOWED_TABLE_MAX_HEIGHT_PX = 760;

export type WindowedListState<T> = {
    total: number;
    visibleItems: T[];
    hasVerticalScroll: boolean;
    isTrimmed: boolean;
    page: number;
    pageSize: number;
    pageCount: number;
    startIndex: number;
    endIndex: number;
    canPreviousPage: boolean;
    canNextPage: boolean;
};

export type WindowedListPaginationMeta = Pick<
    WindowedListState<unknown>,
    "total" | "page" | "pageSize" | "pageCount" | "startIndex" | "endIndex" | "canPreviousPage" | "canNextPage"
>;

export const clampPage = (page: number, pageCount: number) => {
    const parsed = Number(page);
    if (!Number.isFinite(parsed)) return 1;
    return Math.min(Math.max(1, Math.trunc(parsed)), Math.max(1, pageCount));
};

export const buildWindowedListState = <T,>(
    items: T[],
    page = 1,
    pageSize = WINDOWED_LIST_PAGE_SIZE,
): WindowedListState<T> => {
    const total = items.length;
    const safePageSize = Math.max(1, Math.trunc(pageSize));
    const pageCount = Math.max(1, Math.ceil(total / safePageSize));
    const currentPage = clampPage(page, pageCount);
    const startIndex = total === 0 ? 0 : (currentPage - 1) * safePageSize;
    const endIndex = Math.min(startIndex + safePageSize, total);
    const visibleItems = items.slice(startIndex, endIndex);

    return {
        total,
        visibleItems,
        hasVerticalScroll: visibleItems.length > WINDOWED_LIST_VISIBLE_ROWS,
        isTrimmed: total > safePageSize,
        page: currentPage,
        pageSize: safePageSize,
        pageCount,
        startIndex,
        endIndex,
        canPreviousPage: currentPage > 1,
        canNextPage: currentPage < pageCount,
    };
};
