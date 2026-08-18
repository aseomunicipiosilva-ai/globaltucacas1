'use client';
import React from 'react';
import Image from 'next/image';

interface ReciboProps {
  reciboNo: string;
  controlWeb?: string;
  fechaEmision: string;
  codContribuyente: string;
  razonSocial: string;
  domicilioFiscal: string;
  rifCi: string;
  caja: string;
  conceptos: {
    descripcion: string;
    precioUnit: number;
    total: number;
  }[];
  subTotal: number;
  exento: number;
  iva: number;
  total: number;
  formaPago: string;
  banco: string;
  referencia: string;
}

export function ReciboImprimible({ data }: { data: ReciboProps }) {
  return (
    <div className="bg-white text-black p-8 max-w-4xl mx-auto border border-slate-200 shadow-sm print:shadow-none print:border-none">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <Image src="/images/logo_alcaldia.png" alt="Alcaldía" width={80} height={80} className="object-contain" />
          <div>
            <h1 className="font-bold text-sm tracking-wide">INSTITUTO SOCIALISTA MUNICIPAL PARA EL AMBIENTE (I.S.M.A)</h1>
            <p className="text-xs max-w-sm leading-tight mt-1">
              DOMICILIO FISCAL: AV LIBERTADOR CC GRILL NIVEL 01 OF 03 BARRIO LIBERTADOR TUCACAS FALCON ZONA POSTAL 2054
            </p>
            <p className="text-xs font-bold mt-1">RIF: G-200076739</p>
          </div>
        </div>
        <div className="text-right">
          <Image src="/images/logo_isma.png" alt="ISMA" width={160} height={60} className="object-contain" />
        </div>
      </div>

      <div className="text-center font-bold text-lg mb-6 tracking-widest">
        RECIBO DE ASEO URBANO
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-4 border border-black text-sm mb-6">
        <div className="col-span-3 border-r border-black p-2 space-y-2">
          <div className="flex gap-2">
            <span className="font-bold">Fecha de Emisión:</span> {data.fechaEmision}
          </div>
          <div className="flex gap-2">
            <span className="font-bold">Cod. Contribuyente:</span> {data.codContribuyente}
          </div>
          <div className="flex gap-2">
            <span className="font-bold">Razón Social/Nombre:</span> {data.razonSocial}
          </div>
          <div className="flex gap-2">
            <span className="font-bold">Domicilio Fiscal:</span> {data.domicilioFiscal}
          </div>
          <div className="flex gap-2">
            <span className="font-bold">RIF / C.I.:</span> {data.rifCi}
          </div>
        </div>
        <div className="col-span-1 p-2 space-y-2">
          <div className="flex flex-col h-full justify-between">
            <div>
              <span className="font-bold block">RECIBO N°</span>
              <span>{data.reciboNo}</span>
              
              {data.controlWeb && (
                <div className="mt-2 pt-1">
                  <span className="font-bold block">N° CONTROL WEB</span>
                  <span className="text-xs font-semibold">{data.controlWeb}</span>
                </div>
              )}
            </div>
            <div className="mt-auto">
              <span className="font-bold block">CAJA:</span>
              <span className="text-xs">{data.caja}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse border border-black text-sm mb-6">
        <thead>
          <tr className="border-b border-black">
            <th className="text-left p-2 border-r border-black w-3/5">CONCEPTO</th>
            <th className="text-right p-2 border-r border-black w-1/5">PRECIO UNIT</th>
            <th className="text-right p-2 w-1/5">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-2 border-r border-black border-b border-black"></td>
            <td className="p-2 border-r border-black border-b border-black bg-slate-100 text-center font-bold">Bs.</td>
            <td className="p-2 border-b border-black bg-slate-100 text-center font-bold">Bs.</td>
          </tr>
          {data.conceptos.map((c, i) => (
            <tr key={i}>
              <td className="p-2 border-r border-black text-left">{c.descripcion}</td>
              <td className="p-2 border-r border-black text-right">Bs. {c.precioUnit.toFixed(2)}</td>
              <td className="p-2 text-right">Bs. {c.total.toFixed(2)}</td>
            </tr>
          ))}
          {/* Pad with empty rows to match height if needed */}
          <tr className="h-16">
            <td className="p-2 border-r border-black"></td>
            <td className="p-2 border-r border-black"></td>
            <td className="p-2"></td>
          </tr>
        </tbody>
      </table>

      {/* Totals & Payment */}
      <div className="grid grid-cols-4 border border-black text-sm">
        <div className="col-span-3 border-r border-black p-2 flex flex-col justify-end">
          <div className="font-bold mb-1">Forma de Pago:</div>
          <div className="flex gap-4 items-center mb-2">
            <span>PUNTO DE VENTA <u className="font-bold">{data.formaPago === 'PUNTO DE VENTA' ? ' X ' : '___'}</u></span>
            <span>TRANSFERENCIA <u className="font-bold">{data.formaPago === 'TRANSFERENCIA' ? ' X ' : '___'}</u></span>
          </div>
          <div>
            <strong>Banco:</strong> {data.banco} &nbsp;&nbsp; <strong>Referencia:</strong> {data.referencia} &nbsp;&nbsp; <strong>Monto:</strong> Bs. {data.total.toFixed(2)}
          </div>
        </div>
        <div className="col-span-1">
          <div className="flex justify-between border-b border-black p-1">
            <span className="font-bold">Sub-Total</span>
            <span>Bs. {data.subTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-b border-black p-1">
            <span className="font-bold">Exento</span>
            <span>Bs. {data.exento.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-b border-black p-1">
            <span className="font-bold">Iva (16%)</span>
            <span>Bs. {data.iva.toFixed(2)}</span>
          </div>
          <div className="flex justify-between p-1 bg-slate-100">
            <span className="font-bold">Total</span>
            <span className="font-bold">Bs. {data.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
