'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  APPROVAL_STEP_STATUS_LABELS_TH,
  APPROVAL_WORKFLOW_STATUS_LABELS_TH,
  type ApprovalStepStatus,
  type ApprovalWorkflowStatus,
  type Role,
} from '@ai-market/shared';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/form';
import { SectionTitle } from '@/components/ui/page-header';
import { Icon } from '@/components/ui/icon';
import { classNames } from '@/components/ui/format';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100/api/v1';

interface Step {
  id: string;
  ordinal: number;
  title: string;
  approverRole: Role | null;
  status: ApprovalStepStatus;
  comment: string | null;
  decidedAt: string | null;
}

interface Workflow {
  id: string;
  status: ApprovalWorkflowStatus;
  currentStep: number;
  startedAt: string;
  completedAt: string | null;
  steps: Step[];
}

const STEP_STATUS_TONE: Record<ApprovalStepStatus, string> = {
  PENDING: 'bg-ink-100 dark:bg-ink-800 text-ink-500 dark:text-ink-300',
  APPROVED: 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200',
  REJECTED: 'bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-200',
  RETURNED: 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200',
  SKIPPED: 'bg-ink-100 dark:bg-ink-800 text-ink-400 dark:text-ink-400',
};

const STEP_STATUS_ICON: Record<ApprovalStepStatus, string> = {
  PENDING: 'Clock',
  APPROVED: 'Check',
  REJECTED: 'X',
  RETURNED: 'RotateCcw',
  SKIPPED: 'Minus',
};

export function ApprovalPanel({
  prId,
  workflow,
  userRoles,
}: {
  prId: string;
  workflow: Workflow;
  userRoles: Role[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<'approve' | 'reject' | 'return' | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = workflow.steps.find((s) => s.ordinal === workflow.currentStep);
  const canActOnCurrent =
    workflow.status === 'IN_PROGRESS' &&
    current?.approverRole != null &&
    userRoles.includes(current.approverRole);

  async function submit(action: 'approve' | 'reject' | 'return') {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_URL}/purchase-requests/${prId}/approval/${action}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment: comment.trim() }),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? `ทำรายการไม่สำเร็จ (${res.status})`);
        return;
      }
      setMode(null);
      setComment('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <SectionTitle
        icon={<Icon name="UserCheck" className="w-3.5 h-3.5" />}
        title="สายอนุมัติ"
        sub={`สถานะ: ${APPROVAL_WORKFLOW_STATUS_LABELS_TH[workflow.status]} · เริ่ม ${new Date(
          workflow.startedAt,
        ).toLocaleString('th-TH')}`}
      />

      <ol className="mt-3 space-y-2">
        {workflow.steps.map((s) => {
          const isCurrent =
            s.ordinal === workflow.currentStep && workflow.status === 'IN_PROGRESS';
          return (
            <li
              key={s.id}
              className={classNames(
                'flex items-start gap-3 rounded-xl p-3',
                isCurrent && 'ring-2 ring-brand-300 dark:ring-brand-700',
                'border border-ink-100 dark:border-white/5',
              )}
            >
              <span
                className={classNames(
                  'grid place-items-center w-7 h-7 rounded-lg shrink-0 text-[11px] font-bold',
                  s.status === 'APPROVED'
                    ? 'bg-emerald-500 text-white'
                    : s.status === 'REJECTED'
                      ? 'bg-rose-500 text-white'
                      : s.status === 'RETURNED'
                        ? 'bg-amber-500 text-white'
                        : isCurrent
                          ? 'grad-brand text-white'
                          : 'bg-ink-100 dark:bg-ink-800 text-ink-500 dark:text-ink-300',
                )}
              >
                {s.status === 'PENDING' && !isCurrent ? (
                  s.ordinal
                ) : (
                  <Icon
                    name={
                      (STEP_STATUS_ICON[s.status] as Parameters<typeof Icon>[0]['name']) ??
                      'Circle'
                    }
                    className="w-3.5 h-3.5"
                    strokeWidth={2.5}
                  />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-ink-900 dark:text-white">
                    {s.title}
                  </span>
                  <span
                    className={classNames(
                      'rounded px-1.5 py-0.5 text-[10px] font-semibold',
                      STEP_STATUS_TONE[s.status],
                    )}
                  >
                    {APPROVAL_STEP_STATUS_LABELS_TH[s.status]}
                  </span>
                </div>
                {s.comment && (
                  <p className="mt-1 text-xs text-ink-600 dark:text-ink-200 leading-relaxed">
                    💬 {s.comment}
                  </p>
                )}
                {s.decidedAt && (
                  <p className="mt-0.5 text-[11px] text-ink-400 dark:text-ink-300 tabular-nums">
                    {new Date(s.decidedAt).toLocaleString('th-TH')}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {canActOnCurrent && current && (
        <div className="mt-4 rounded-2xl border border-brand-200 dark:border-brand-700/40 bg-brand-50/60 dark:bg-brand-900/20 p-4">
          <div className="text-sm font-semibold text-brand-800 dark:text-brand-100">
            ถึงคิวคุณตัดสินใจ — {current.title}
          </div>
          {!mode ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                icon="Check"
                onClick={() => setMode('approve')}
                className="!bg-emerald-600 hover:!bg-emerald-700 !bg-none"
              >
                อนุมัติ
              </Button>
              <Button
                size="sm"
                variant="outline"
                icon="RotateCcw"
                onClick={() => setMode('return')}
                className="text-amber-700 dark:text-amber-200 ring-amber-300/60 dark:ring-amber-700/40"
              >
                ส่งกลับแก้ไข
              </Button>
              <Button
                size="sm"
                variant="outline"
                icon="X"
                onClick={() => setMode('reject')}
                className="text-rose-700 dark:text-rose-300 ring-rose-300/60 dark:ring-rose-700/40"
              >
                ไม่อนุมัติ
              </Button>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <div className="text-[12px] text-ink-600 dark:text-ink-200">
                {mode === 'approve' && 'ความเห็น (ไม่บังคับ)'}
                {mode === 'reject' && 'เหตุผลที่ไม่อนุมัติ (จำเป็น)'}
                {mode === 'return' && 'เหตุผลที่ส่งกลับ (จำเป็น)'}
              </div>
              <Textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  mode === 'approve'
                    ? 'ตรวจสอบครบถ้วน อนุมัติ'
                    : mode === 'reject'
                      ? 'ระบุเหตุผลที่ไม่อนุมัติ'
                      : 'ระบุประเด็นที่ต้องแก้'
                }
              />
              {error && (
                <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={busy || (mode !== 'approve' && !comment.trim())}
                  onClick={() => submit(mode)}
                  className={classNames(
                    mode === 'approve' && '!bg-emerald-600 hover:!bg-emerald-700 !bg-none',
                    mode === 'reject' && '!bg-rose-600 hover:!bg-rose-700 !bg-none',
                    mode === 'return' && '!bg-amber-600 hover:!bg-amber-700 !bg-none',
                  )}
                  icon={mode === 'approve' ? 'Check' : mode === 'reject' ? 'X' : 'RotateCcw'}
                >
                  {busy
                    ? 'กำลังส่ง...'
                    : mode === 'approve'
                      ? 'ยืนยันอนุมัติ'
                      : mode === 'reject'
                        ? 'ยืนยันไม่อนุมัติ'
                        : 'ยืนยันส่งกลับ'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setMode(null);
                    setComment('');
                    setError(null);
                  }}
                >
                  ยกเลิก
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
