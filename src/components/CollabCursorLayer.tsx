import React from 'react';
import type { RemotePresence } from '../services/collaboration/moodboardCollaboration';

interface CollabCursorLayerProps {
    users: RemotePresence[];
    localUserId: string | null;
}

const cursorBodyStyle: React.CSSProperties = {
    width: 12,
    height: 12,
    borderRadius: 9999,
    border: '2px solid white',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
};

export const CollabCursorLayer: React.FC<CollabCursorLayerProps> = ({ users, localUserId }) => {
    const remoteUsers = users.filter((user) => user.userId !== localUserId && user.cursor);
    if (remoteUsers.length === 0) return null;

    return (
        <div className="absolute inset-0 z-[9998] pointer-events-none">
            {remoteUsers.map((user) => {
                if (!user.cursor) return null;
                return (
                    <div
                        key={user.clientId}
                        className="absolute"
                        style={{
                            left: `${user.cursor.x}%`,
                            top: `${user.cursor.y}%`,
                            transform: 'translate(-50%, -50%)'
                        }}
                    >
                        <div style={{ ...cursorBodyStyle, backgroundColor: user.color }} />
                        <div
                            className="mt-1 px-2 py-1 rounded-[8px] text-[11px] font-medium text-white whitespace-nowrap"
                            style={{ backgroundColor: user.color }}
                        >
                            {user.displayName}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
