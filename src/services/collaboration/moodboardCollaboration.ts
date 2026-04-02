import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { nanoid } from 'nanoid';

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected';

export interface CursorPosition {
    x: number;
    y: number;
}

export interface PresenceState {
    userId: string;
    displayName: string;
    color: string;
    cursor: CursorPosition | null;
    selectedItemIds: string[];
    updatedAt: number;
}

export interface RemotePresence extends PresenceState {
    clientId: number;
}

const DEFAULT_WEBSOCKET_URL = import.meta.env.VITE_YJS_WEBSOCKET_URL || 'wss://demos.yjs.dev';

interface CreateCollaborationOptions<TItem, TSettings> {
    roomId: string;
    initialItems: TItem[];
    initialSettings: TSettings;
    displayName?: string;
    onItemsChange: (items: TItem[]) => void;
    onSettingsChange?: (settings: Partial<TSettings>) => void;
    onPresenceChange?: (presence: RemotePresence[]) => void;
    onStatusChange?: (status: RealtimeStatus) => void;
}

const colorPalette = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1'];

const getRandomColor = () => colorPalette[Math.floor(Math.random() * colorPalette.length)];

export class MoodboardCollaboration<TItem, TSettings extends Record<string, unknown>> {
    private readonly doc: Y.Doc;
    private readonly provider: WebsocketProvider;
    private readonly boardMap: Y.Map<unknown>;
    private readonly userId: string;
    private readonly presenceBase: Pick<PresenceState, 'userId' | 'displayName' | 'color'>;
    private readonly onItemsChange: (items: TItem[]) => void;
    private readonly onSettingsChange?: (settings: Partial<TSettings>) => void;
    private readonly onPresenceChange?: (presence: RemotePresence[]) => void;
    private readonly onStatusChange?: (status: RealtimeStatus) => void;
    private suppressLocalObserver = false;

    constructor(options: CreateCollaborationOptions<TItem, TSettings>) {
        this.doc = new Y.Doc();
        this.provider = new WebsocketProvider(DEFAULT_WEBSOCKET_URL, options.roomId, this.doc, {
            connect: true
        });
        this.boardMap = this.doc.getMap('board');
        this.userId = nanoid(10);
        this.presenceBase = {
            userId: this.userId,
            displayName: options.displayName?.trim() || `Guest-${this.userId.slice(-4)}`,
            color: getRandomColor()
        };
        this.onItemsChange = options.onItemsChange;
        this.onSettingsChange = options.onSettingsChange;
        this.onPresenceChange = options.onPresenceChange;
        this.onStatusChange = options.onStatusChange;

        const hasItems = this.boardMap.has('items');
        if (!hasItems) {
            this.boardMap.set('items', options.initialItems);
            this.boardMap.set('settings', options.initialSettings);
            this.boardMap.set('updatedAt', Date.now());
        }

        this.boardMap.observe(this.handleBoardUpdate);
        this.provider.on('status', this.handleProviderStatus);
        this.provider.awareness.on('change', this.handlePresenceChange);
        this.provider.awareness.setLocalState(this.buildPresenceState({ cursor: null, selectedItemIds: [] }));

        const syncedItems = this.getItems();
        if (syncedItems.length > 0) {
            this.onItemsChange(syncedItems);
        }
        const syncedSettings = this.getSettings();
        if (syncedSettings && this.onSettingsChange) {
            this.onSettingsChange(syncedSettings);
        }
        this.emitPresence();
    }

    private readonly handleProviderStatus = ({ status }: { status: RealtimeStatus }) => {
        this.onStatusChange?.(status);
    };

    private readonly handleBoardUpdate = () => {
        if (this.suppressLocalObserver) return;
        this.onItemsChange(this.getItems());
        const settings = this.getSettings();
        if (settings && this.onSettingsChange) {
            this.onSettingsChange(settings);
        }
    };

    private readonly handlePresenceChange = () => {
        this.emitPresence();
    };

    private emitPresence() {
        if (!this.onPresenceChange) return;
        const states = Array.from(this.provider.awareness.getStates().entries());
        const users: RemotePresence[] = states
            .map(([clientId, value]) => {
                const state = value as PresenceState | undefined;
                if (!state || !state.userId) return null;
                return {
                    clientId,
                    userId: state.userId,
                    displayName: state.displayName,
                    color: state.color,
                    cursor: state.cursor,
                    selectedItemIds: state.selectedItemIds ?? [],
                    updatedAt: state.updatedAt ?? Date.now()
                };
            })
            .filter((value): value is RemotePresence => value !== null);

        this.onPresenceChange(users);
    }

    private buildPresenceState(fields: Pick<PresenceState, 'cursor' | 'selectedItemIds'>): PresenceState {
        return {
            ...this.presenceBase,
            cursor: fields.cursor,
            selectedItemIds: fields.selectedItemIds,
            updatedAt: Date.now()
        };
    }

    getItems(): TItem[] {
        return (this.boardMap.get('items') as TItem[]) ?? [];
    }

    getSettings(): Partial<TSettings> | undefined {
        return this.boardMap.get('settings') as Partial<TSettings> | undefined;
    }

    setItems(nextItems: TItem[]) {
        this.doc.transact(() => {
            this.suppressLocalObserver = true;
            this.boardMap.set('items', nextItems);
            this.boardMap.set('updatedAt', Date.now());
            this.suppressLocalObserver = false;
        }, this.userId);
    }

    setSettings(nextSettings: Partial<TSettings>) {
        const current = this.getSettings() ?? {};
        this.doc.transact(() => {
            this.suppressLocalObserver = true;
            this.boardMap.set('settings', { ...current, ...nextSettings });
            this.boardMap.set('updatedAt', Date.now());
            this.suppressLocalObserver = false;
        }, this.userId);
    }

    setDisplayName(displayName: string) {
        const normalized = displayName.trim();
        if (!normalized) return;
        this.provider.awareness.setLocalState(this.buildPresenceState({
            cursor: this.getLocalCursor(),
            selectedItemIds: this.getLocalSelectedItemIds(),
        }));
        const localState = this.provider.awareness.getLocalState() as PresenceState | null;
        if (localState) {
            this.provider.awareness.setLocalState({
                ...localState,
                displayName: normalized,
                updatedAt: Date.now()
            });
        }
    }

    setCursor(cursor: CursorPosition | null) {
        const localState = (this.provider.awareness.getLocalState() as PresenceState | null) ?? this.buildPresenceState({
            cursor: null,
            selectedItemIds: []
        });
        this.provider.awareness.setLocalState({
            ...localState,
            cursor,
            updatedAt: Date.now()
        });
    }

    setSelectedItems(selectedItemIds: string[]) {
        const localState = (this.provider.awareness.getLocalState() as PresenceState | null) ?? this.buildPresenceState({
            cursor: null,
            selectedItemIds: []
        });
        this.provider.awareness.setLocalState({
            ...localState,
            selectedItemIds,
            updatedAt: Date.now()
        });
    }

    getLocalUserId() {
        return this.userId;
    }

    private getLocalCursor() {
        const localState = this.provider.awareness.getLocalState() as PresenceState | null;
        return localState?.cursor ?? null;
    }

    private getLocalSelectedItemIds() {
        const localState = this.provider.awareness.getLocalState() as PresenceState | null;
        return localState?.selectedItemIds ?? [];
    }

    destroy() {
        this.boardMap.unobserve(this.handleBoardUpdate);
        this.provider.awareness.off('change', this.handlePresenceChange);
        this.provider.off('status', this.handleProviderStatus);
        this.provider.destroy();
        this.doc.destroy();
    }
}
