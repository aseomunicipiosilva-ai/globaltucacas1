'use client';
import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  itemsPerPage?: number;
  searchable?: boolean;
}

export function DataTable<T extends Record<string, any>>({ data, columns, itemsPerPage = 25, searchable = true }: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term to fix performance issues with large datasets
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Filter data using the debounced term
  const filteredData = React.useMemo(() => {
    return data.filter((item) => {
      if (!debouncedSearchTerm) return true;
      return Object.values(item).some((val) => 
        String(val).toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    });
  }, [data, debouncedSearchTerm]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="bg-white rounded shadow flex flex-col w-full text-sm">
      {/* Header controls */}
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <div className="flex items-center gap-2">
          <span className="text-slate-600">Mostrar</span>
          <select 
            className="border border-slate-300 rounded px-2 py-1 text-slate-700 bg-white"
            disabled // Placeholder as we use fixed itemsPerPage for now
          >
            <option>{itemsPerPage}</option>
          </select>
          <span className="text-slate-600">registros</span>
        </div>

        {searchable && (
          <div className="flex items-center gap-2">
            <span className="text-slate-600">Buscar:</span>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="border border-slate-300 rounded pl-2 pr-8 py-1 outline-none focus:border-blue-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-2 top-1.5" />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white border-b border-slate-200">
              {columns.map((col, idx) => (
                <th key={idx} className="px-4 py-3 font-semibold text-[10px] uppercase text-slate-900 tracking-wider">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentData.length > 0 ? (
              currentData.map((row, rowIdx) => (
                <tr key={rowIdx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="px-4 py-3 text-slate-600">
                      {col.render ? col.render(row) : (row[col.key] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                  Ningún dato disponible en esta tabla
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-slate-200 flex justify-end items-center">
        <div className="flex rounded border border-slate-300 overflow-hidden">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 border-r border-slate-300"
          >
            Anterior
          </button>
          <div className="px-4 py-1 bg-blue-500 text-white font-medium">
            {currentPage}
          </div>
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="px-3 py-1 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 border-l border-slate-300"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
