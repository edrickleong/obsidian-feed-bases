import {
  BasesEntry,
  BasesPropertyId,
  BasesView,
  Menu,
  QueryController,
} from "obsidian";
import { StrictMode } from "react";
import { createRoot, Root } from "react-dom/client";
import { FeedReactView } from "./FeedReactView";
import { AppContext } from "./context";

export const FeedViewType = "feed";

export class FeedView extends BasesView {
  type = FeedViewType;
  scrollEl: HTMLElement;
  containerEl: HTMLElement;
  root: Root | null = null;

  private entries: BasesEntry[] = [];

  constructor(controller: QueryController, scrollEl: HTMLElement) {
    super(controller);
    this.scrollEl = scrollEl;
    this.containerEl = scrollEl.createDiv({
      cls: "bases-feed-container is-loading",
      attr: { tabIndex: 0 },
    });
  }

  onload(): void {
    // React components will handle their own lifecycle
  }

  onunload() {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
    this.entries = [];
  }

  onResize(): void {
    // Feed view should adapt to resizing automatically
  }

  public focus(): void {
    this.containerEl.focus({ preventScroll: true });
  }

  public onDataUpdated(): void {
    this.containerEl.removeClass("is-loading");
    this.updateFeed();
  }

  private updateFeed(): void {
    if (!this.data) {
      this.root?.unmount();
      this.root = null;
      this.containerEl.empty();
      this.containerEl.createDiv("bases-feed-empty").textContent =
        "No entries to display";
      return;
    }

    this.entries = [...this.data.data].filter(
      (entry) => entry.file.extension === "md",
    );

    const sort = this.config.getSort();
    const firstSortProperty = sort?.[0]?.property;
    // Normalize direction to 'ASC' | 'DESC'; default to ASC for alphabetical title sort
    const firstSortDirection = sort?.[0]?.direction ?? "ASC";
    // Always call sort with a comparator. If no property selected, default to file title A–Z.
    this.entries.sort(
      this.getEntryComparator(firstSortProperty, firstSortDirection),
    );

    this.renderReactFeed();
  }

  // Build a comparator for entries based on an optional property and direction.
  // If no property is provided, defaults to sorting by file title (basename) A–Z.
  private getEntryComparator(
    property?: BasesPropertyId,
    direction: "ASC" | "DESC" = "ASC",
  ): (a: BasesEntry, b: BasesEntry) => number {
    if (property) {
      return (a: BasesEntry, b: BasesEntry) => {
        const valueA = this.getPropertyValue(a, property);
        const valueB = this.getPropertyValue(b, property);

        let compareValue = 0;
        if (valueA === null && valueB === null) {
          compareValue = 0;
        } else if (valueA === null) {
          compareValue = 1; // nulls last
        } else if (valueB === null) {
          compareValue = -1; // nulls last
        } else if (typeof valueA === "number" && typeof valueB === "number") {
          compareValue = valueA - valueB;
        } else {
          compareValue = String(valueA).localeCompare(
            String(valueB),
            undefined,
            {
              numeric: true,
              sensitivity: "base",
            },
          );
        }

        return direction === "ASC" ? compareValue : -compareValue;
      };
    }

    // Default: sort by file title (basename) A–Z, case-insensitive, numeric-aware
    return (a: BasesEntry, b: BasesEntry) =>
      a.file.basename.localeCompare(b.file.basename, undefined, {
        numeric: true,
        sensitivity: "base",
      });
  }

  private getPropertyValue(entry: BasesEntry, propId: BasesPropertyId): any {
    try {
      const value = entry.getValue(propId);
      if (!value || !value.isTruthy()) return null;

      // Try to get a comparable value
      const valueObj = value as any;
      if (valueObj instanceof Date) return valueObj.getTime();
      if (typeof valueObj === "object" && "valueOf" in valueObj) {
        return valueObj.valueOf();
      }
      const str = value.toString();
      return str && str.trim().length > 0 ? str : null;
    } catch {
      return null;
    }
  }

  private renderReactFeed(): void {
    if (!this.root) {
      this.root = createRoot(this.containerEl);
    }

    const showProperties =
      (this.config.get("showProperties") as boolean | undefined) ?? false;

    this.root.render(
      <StrictMode>
        <AppContext.Provider value={this.app}>
          <FeedReactView
            entries={this.entries}
            scrollElement={this.scrollEl}
            showProperties={showProperties}
            onEntryClick={(entry: BasesEntry, isModEvent: boolean) => {
              void this.app.workspace.openLinkText(
                entry.file.path,
                "",
                isModEvent,
              );
            }}
            onEntryContextMenu={(evt: React.MouseEvent, entry: BasesEntry) => {
              evt.preventDefault();
              this.showEntryContextMenu(evt.nativeEvent as MouseEvent, entry);
            }}
          />
        </AppContext.Provider>
      </StrictMode>,
    );
  }

  private showEntryContextMenu(evt: MouseEvent, entry: BasesEntry): void {
    const file = entry.file;
    const menu = Menu.forEvent(evt);

    this.app.workspace.handleLinkContextMenu(menu, file.path, "");
  }
}
