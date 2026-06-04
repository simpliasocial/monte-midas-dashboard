import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WindowedListPaginationMeta } from "@/lib/windowedList";

type TablePaginationControlsProps = {
    pageState: WindowedListPaginationMeta;
    onPageChange: (page: number) => void;
};

export const TablePaginationControls = ({
    pageState,
    onPageChange,
}: TablePaginationControlsProps) => {
    if (pageState.total === 0) return null;

    const rangeStart = pageState.startIndex + 1;
    const rangeEnd = pageState.endIndex;
    const hasMultiplePages = pageState.pageCount > 1;

    return (
        <div className="flex flex-col gap-3 border-t bg-background px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div className="font-medium">
                Mostrando <span className="text-foreground">{rangeStart}-{rangeEnd}</span> de{" "}
                <span className="text-foreground">{pageState.total}</span>
            </div>

            {hasMultiplePages && (
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        title="Primera página"
                        onClick={() => onPageChange(1)}
                        disabled={!pageState.canPreviousPage}
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1"
                        onClick={() => onPageChange(pageState.page - 1)}
                        disabled={!pageState.canPreviousPage}
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                    </Button>
                    <span className="min-w-[92px] text-center font-medium text-foreground">
                        Página {pageState.page} de {pageState.pageCount}
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1"
                        onClick={() => onPageChange(pageState.page + 1)}
                        disabled={!pageState.canNextPage}
                    >
                        Siguiente
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        title="Última página"
                        onClick={() => onPageChange(pageState.pageCount)}
                        disabled={!pageState.canNextPage}
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
};
