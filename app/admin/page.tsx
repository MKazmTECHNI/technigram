"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const serverAddress = process.env.NEXT_PUBLIC_SERVER_ADDRESS;

function retrieveUser() {
    const userData = localStorage.getItem("currentUser");
    return userData ? JSON.parse(userData) : null;
}

export default function AdminPanel() {
    const router = useRouter();
    const [permissionChecked, setPermissionChecked] = useState(false);
    const [newRow, setNewRow] = useState<any>({});
    const [editRowIndex, setEditRowIndex] = useState<number | null>(null);
    const [editRow, setEditRow] = useState<any>({});
    const [tables, setTables] = useState<{ name: string }[]>([]);
    const [selectedTable, setSelectedTable] = useState("");
    const [tableData, setTableData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

    useEffect(() => {
        const { id, token } = retrieveUser() || {};
        if (!id || !token) {
            router.replace("/");
            return;
        }
        setPermissionChecked(true);
        fetch(`${serverAddress}/api/db/tables`, {
            headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "X-User-Id": id
            }
        })
            .then((res) => res.json())
            .then((data) => {
            console.log('Tables response:', data);
            if (data?.error || data?.status === 403) {
                // Show error on page if forbidden or error
                setTables([{ name: `Error: ${data?.error || 'Forbidden (403)'}` }]);
            }
            else {

                setTables(Array.isArray(data.tables) ? data.tables : []);
            }
            });
    }, [router]);
    
    const loadTable = (table: string) => {
        setSelectedTable(table);
        setLoading(true);
        const { id, token } = retrieveUser() || {};
        fetch(`${serverAddress}/api/db/tables/${table}`, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                "X-User-Id": id
            }
        })
            .then((res) => res.json())
            .then((data) => {
                setTableData(data.data || []);
                setVisibleColumns([]);
                setLoading(false);
            });
    };

    const toggleColumn = (col: string) => {
        setVisibleColumns((prev) =>
            prev.includes(col)
                ? prev.filter((c) => c !== col)
                : [...prev, col]
        );
    };

    // Auto-detect primary key
    const primaryKey = tableData[0]
        ? Object.keys(tableData[0]).find((key) => key === 'id' || key.endsWith('_id')) || Object.keys(tableData[0])[0]
        : 'id';

    if (!permissionChecked) {
        return null;
    }
    return (
        <div style={{ padding: 32 }}>
            <h1>Admin Panel</h1>
            <h2>Tables</h2>
            <ul>
                {tables.map((t) => (
                    <li key={t.name}>
                        <button onClick={() => loadTable(t.name)}>{t.name}</button>
                    </li>
                ))}
            </ul>
            {selectedTable && (
                <div>
                    <h2>Table: {selectedTable}</h2>
                    {loading ? (
                        <p>Loading...</p>
                    ) : (
                        <>
                            {/* Add Row Form */}
                            {tableData[0] && (
                                <div style={{ width: 900, overflowX: 'auto', marginBottom: 16 }}>
                                    <form
                                        style={{ display: 'flex', alignItems: 'center', minWidth: 900 }}
                                        onSubmit={async (e) => {
                                            e.preventDefault();
                                            const { id, token } = retrieveUser() || {};
                                            await fetch(`${serverAddress}/api/db/tables/${selectedTable}`, {
                                                method: "POST",
                                                headers: {
                                                    "Content-Type": "application/json",
                                                    "Authorization": `Bearer ${token}`,
                                                    "X-User-Id": id
                                                },
                                                body: JSON.stringify(newRow),
                                            });
                                            setNewRow({});
                                            loadTable(selectedTable);
                                        }}
                                    >
                                        <h3 style={{ marginRight: 16 }}>Add Row</h3>
                                        {Object.keys(tableData[0]).map((col) => (
                                            <input
                                                key={col}
                                                placeholder={col}
                                                value={newRow[col] || ""}
                                                onChange={(e) => setNewRow({ ...newRow, [col]: e.target.value })}
                                                style={{ marginRight: 8, minWidth: 120 }}
                                            />
                                        ))}
                                        <button type="submit">Add</button>
                                    </form>
                                </div>
                            )}
                            <div style={{ width: 900, overflowX: 'auto', marginBottom: 16 }}>
                                <table border={1} cellPadding={8} style={{ minWidth: 900 }}>
                                    <thead>
                                        <tr>
                                            {tableData[0] &&
                                                Object.keys(tableData[0]).map((col) => (
                                                    <th key={col}>
                                                        <button onClick={() => toggleColumn(col)}>
                                                            {visibleColumns.includes(col) ? "Hide" : "Show"} {col}
                                                        </button>
                                                    </th>
                                                ))}
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tableData.map((row, i) => {
                                            console.log('Row:', row);
                                            console.log('Row primaryKey value:', row ? row[primaryKey] : undefined);
                                            return (
                                                <tr key={i}>
                                                    {tableData[0] &&
                                                        Object.keys(tableData[0]).map((col, j) => (
                                                            <td key={j}>
                                                                {editRowIndex === i ? (
                                                                    <input
                                                                        value={editRow[col] || ""}
                                                                        onChange={(e) => setEditRow({ ...editRow, [col]: e.target.value })}
                                                                    />
                                                                ) : visibleColumns.includes(col) ? row[col] : null}
                                                            </td>
                                                        ))}
                                                    <td>
                                                        {editRowIndex === i ? (
                                                            <>
                                                                <button
                                                                    onClick={async () => {
                                                                        const { id, token } = retrieveUser() || {};
                                                                        await fetch(`${serverAddress}/api/db/tables/${selectedTable}/${row[primaryKey]}`, {
                                                                            method: "DELETE",
                                                                            headers: {
                                                                                "Content-Type": "application/json",
                                                                                "Authorization": `Bearer ${token}`,
                                                                                "X-User-Id": id
                                                                            }
                                                                        });
                                                                        setEditRowIndex(null);
                                                                        loadTable(selectedTable);
                                                                    }}
                                                                >Delete</button>
                                                                <button
                                                                    onClick={async () => {
                                                                        const { id, token } = retrieveUser() || {};
                                                                        await fetch(`${serverAddress}/api/db/tables/${selectedTable}/${row[primaryKey]}`, {
                                                                            method: "PUT",
                                                                            headers: {
                                                                                "Content-Type": "application/json",
                                                                                "Authorization": `Bearer ${token}`,
                                                                                "X-User-Id": id
                                                                            },
                                                                            body: JSON.stringify(editRow),
                                                                        });
                                                                        setEditRowIndex(null);
                                                                        setEditRow({});
                                                                        loadTable(selectedTable);
                                                                    }}
                                                                >Save</button>
                                                                <button onClick={() => { setEditRowIndex(null); setEditRow({}); }}>Cancel</button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => { setEditRowIndex(i); setEditRow(row); }}>Edit</button>
                                                                <button
                                                                    onClick={async () => {
                                                                        const { id, token } = retrieveUser() || {};
                                                                        await fetch(`${serverAddress}/api/db/tables/${selectedTable}/${row[primaryKey]}`, {
                                                                            method: "DELETE",
                                                                            headers: {
                                                                                "Content-Type": "application/json",
                                                                                "Authorization": `Bearer ${token}`,
                                                                                "X-User-Id": id
                                                                            }
                                                                        });
                                                                        loadTable(selectedTable);
                                                                    }}
                                                                >Delete</button>
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}



