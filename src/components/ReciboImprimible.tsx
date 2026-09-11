'use client';
import React from 'react';
import Image from 'next/image';
import { formatBs } from '@/lib/formatCurrency';

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
  // Campos para pago fraccionado / abono
  esAbono?: boolean;
  montoCancelado?: number;
  montoPendiente?: number;
}

function normalizarFormaPago(fp: string): 'PUNTO_VENTA' | 'TRANSFERENCIA' | 'EFECTIVO' | 'OTRO' {
  const v = (fp || '').toLowerCase().trim();
  if (v.includes('debito') || v.includes('punto') || v.includes('pago movil') || v.includes('pagomovil')) return 'PUNTO_VENTA';
  if (v.includes('transfer') || v.includes('pago movil')) return 'TRANSFERENCIA';
  if (v.includes('efectivo') || v.includes('cash')) return 'EFECTIVO';
  return 'OTRO';
}

export function ReciboImprimible({ data }: { data: ReciboProps }) {
  const fpNorm = normalizarFormaPago(data.formaPago);

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
        {data.esAbono ? 'RECIBO DE ABONO / PAGO PARCIAL' : 'RECIBO DE ASEO URBANO'}
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
              <span className="font-bold block">CAJERO:</span>
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
              <td className="p-2 border-r border-black text-right">Bs. {formatBs(c.precioUnit)}</td>
              <td className="p-2 text-right">Bs. {formatBs(c.total)}</td>
            </tr>
          ))}
          {/* Pad with empty rows */}
          <tr className="h-16">
            <td className="p-2 border-r border-black"></td>
            <td className="p-2 border-r border-black"></td>
            <td className="p-2"></td>
          </tr>
        </tbody>
      </table>

      {/* Abono / Pago parcial info */}
      {data.esAbono && data.montoCancelado !== undefined && data.montoPendiente !== undefined && (
        <div className="border border-black mb-4 text-sm">
          <div className="bg-yellow-50 px-3 py-1 font-bold text-center border-b border-black uppercase tracking-wide">
            Información de Pago Parcial
          </div>
          <div className="grid grid-cols-2">
            <div className="p-2 border-r border-black">
              <span className="font-bold">Monto Cancelado en este Abono:</span>
            </div>
            <div className="p-2 text-right font-bold text-green-800">
              Bs. {formatBs(data.montoCancelado)}
            </div>
            <div className="p-2 border-r border-black border-t border-black">
              <span className="font-bold">Saldo Pendiente por Cancelar:</span>
            </div>
            <div className="p-2 text-right font-bold text-red-700 border-t border-black">
              Bs. {formatBs(data.montoPendiente)}
            </div>
          </div>
        </div>
      )}

      {/* Totals & Payment */}
      <div className="grid grid-cols-4 border border-black text-sm">
        <div className="col-span-3 border-r border-black p-2 flex flex-col justify-end">
          <div className="font-bold mb-2">Forma de Pago:</div>
          <div className="flex gap-6 items-center mb-3 flex-wrap">
            <span className="flex items-center gap-1">
              PUNTO DE VENTA{' '}
              <strong className="inline-block w-6 text-center border border-black">
                {fpNorm === 'PUNTO_VENTA' ? 'X' : ''}
              </strong>
            </span>
            <span className="flex items-center gap-1">
              TRANSFERENCIA{' '}
              <strong className="inline-block w-6 text-center border border-black">
                {fpNorm === 'TRANSFERENCIA' ? 'X' : ''}
              </strong>
            </span>
          </div>
          <div>
            <strong>Banco:</strong> {data.banco} &nbsp;&nbsp; <strong>Referencia:</strong> {data.referencia} &nbsp;&nbsp; <strong>Monto:</strong> Bs. {formatBs(data.esAbono && data.montoCancelado !== undefined ? data.montoCancelado : data.total)}
          </div>
        </div>
        <div className="col-span-1">
          <div className="flex justify-between border-b border-black p-1">
            <span className="font-bold">Sub-Total</span>
            <span>Bs. {formatBs(data.subTotal)}</span>
          </div>
          <div className="flex justify-between border-b border-black p-1">
            <span className="font-bold">Exento</span>
            <span>Bs. {formatBs(data.exento)}</span>
          </div>
          <div className="flex justify-between border-b border-black p-1">
            <span className="font-bold">Iva (16%)</span>
            <span>Bs. {formatBs(data.iva)}</span>
          </div>
          <div className="flex justify-between p-1 bg-slate-100">
            <span className="font-bold">Total</span>
            <span className="font-bold">Bs. {formatBs(data.total)}</span>
          </div>
          {data.esAbono && data.montoCancelado !== undefined && (
            <div className="flex justify-between p-1 bg-green-50 border-t border-black">
              <span className="font-bold text-green-800">Abonado</span>
              <span className="font-bold text-green-800">Bs. {formatBs(data.montoCancelado)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
