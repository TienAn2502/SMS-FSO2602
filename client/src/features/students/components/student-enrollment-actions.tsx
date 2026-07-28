import { zodResolver } from '@hookform/resolvers/zod';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMemo, useState } from 'react';

import { useForm } from 'react-hook-form';

import { toast } from 'sonner';

import { z } from 'zod';



import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';

import { Label } from '@/components/ui/label';

import {

  Sheet,

  SheetContent,

  SheetDescription,

  SheetFooter,

  SheetHeader,

  SheetTitle,

} from '@/components/ui/sheet';

import { fetchAllAcademicYears, fetchSemesters } from '@/features/academic-years/api/academic-years-api';

import { useAuth } from '@/features/auth/hooks/use-auth';

import { fetchHomeroomClasses } from '@/features/homeroom-classes/api/homeroom-classes-api';

import {

  createStudentEnrollment,

  transferStudentEnrollment,

  withdrawStudentEnrollment,

  type StudentEnrollment,

} from '@/features/student-enrollments/api/student-enrollments-api';

import type { Student } from '@/features/students/api/students-api';

import { getApiError } from '@/lib/api';

import { getErrorMessage } from '@/lib/error-messages';

import { selectClassName } from '@/lib/form-styles';



function todayIsoDate(): string {

  const d = new Date();

  const yyyy = d.getFullYear();

  const mm = String(d.getMonth() + 1).padStart(2, '0');

  const dd = String(d.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;

}



const enrollSchema = z.object({

  academicYearId: z.string().uuid('Chọn năm học'),

  semesterId: z.string().uuid('Chọn học kỳ'),

  homeroomClassId: z.string().uuid('Chọn lớp hành chính'),

  enrolledAt: z.string().min(1, 'Ngày ghi danh là bắt buộc'),

  note: z.string().optional(),

});



const transferSchema = z.object({

  targetHomeroomClassId: z.string().uuid('Chọn lớp hành chính'),

  transferredAt: z.string().min(1, 'Ngày chuyển lớp là bắt buộc'),

  note: z.string().optional(),

});



const withdrawSchema = z.object({

  leftAt: z.string().optional(),

  note: z.string().optional(),

});



type EnrollFormValues = z.infer<typeof enrollSchema>;

type TransferFormValues = z.infer<typeof transferSchema>;

type WithdrawFormValues = z.infer<typeof withdrawSchema>;



type SheetMode = 'enroll' | 'transfer' | 'withdraw' | null;



interface StudentEnrollmentActionsProps {

  student: Student;

  activeEnrollment: StudentEnrollment | null;

  activeEnrollments?: StudentEnrollment[];

}



export function StudentEnrollmentActions({

  student,

  activeEnrollment,

  activeEnrollments = [],

}: StudentEnrollmentActionsProps) {

  const { session } = useAuth();

  const queryClient = useQueryClient();

  const [sheetMode, setSheetMode] = useState<SheetMode>(null);



  const yearsQuery = useQuery({

    queryKey: ['academic-years', session?.activeSchoolId, 'all'],

    queryFn: fetchAllAcademicYears,

    enabled: Boolean(session?.activeSchoolId),

  });



  const enrollForm = useForm<EnrollFormValues>({

    resolver: zodResolver(enrollSchema),

    defaultValues: {

      academicYearId: '',

      semesterId: '',

      homeroomClassId: '',

      enrolledAt: todayIsoDate(),

      note: '',

    },

  });



  const transferForm = useForm<TransferFormValues>({

    resolver: zodResolver(transferSchema),

    defaultValues: {

      targetHomeroomClassId: '',

      transferredAt: todayIsoDate(),

      note: '',

    },

  });



  const withdrawForm = useForm<WithdrawFormValues>({

    resolver: zodResolver(withdrawSchema),

    defaultValues: {

      leftAt: todayIsoDate(),

      note: '',

    },

  });



  const enrollYearId = enrollForm.watch('academicYearId');

  const enrollSemesterId = enrollForm.watch('semesterId');

  const transferYearId = activeEnrollment?.academicYearId;



  const enrollSemestersQuery = useQuery({

    queryKey: ['semesters', session?.activeSchoolId, 'enroll', enrollYearId],

    queryFn: () => fetchSemesters(enrollYearId),

    enabled: Boolean(session?.activeSchoolId && enrollYearId),

  });



  const enrollClassesQuery = useQuery({

    queryKey: [

      'homeroom-classes',

      session?.activeSchoolId,

      'enroll',

      enrollYearId,

    ],

    queryFn: () =>

      fetchHomeroomClasses({

        academicYearId: enrollYearId,

        status: 'ACTIVE',

        limit: 100,

      }),

    enabled: Boolean(session?.activeSchoolId && enrollYearId),

  });



  const transferClassesQuery = useQuery({

    queryKey: [

      'homeroom-classes',

      session?.activeSchoolId,

      'transfer',

      transferYearId,

    ],

    queryFn: () =>

      fetchHomeroomClasses({

        academicYearId: transferYearId,

        status: 'ACTIVE',

        limit: 100,

      }),

    enabled: Boolean(session?.activeSchoolId && transferYearId),

  });



  const invalidate = () => {

    void queryClient.invalidateQueries({ queryKey: ['students', student.id] });

    void queryClient.invalidateQueries({

      queryKey: ['student-enrollments', student.id],

    });

    void queryClient.invalidateQueries({ queryKey: ['students'] });

  };



  const enrollMutation = useMutation({

    mutationFn: createStudentEnrollment,

    onSuccess: () => {

      invalidate();

      toast.success('Ghi danh thành công');

      setSheetMode(null);

      enrollForm.reset({

        academicYearId: '',

        semesterId: '',

        homeroomClassId: '',

        enrolledAt: todayIsoDate(),

        note: '',

      });

    },

    onError: (error) => {

      const apiError = getApiError(error);

      toast.error(getErrorMessage(apiError?.code, apiError?.message ?? 'Ghi danh thất bại'));

    },

  });



  const transferMutation = useMutation({

    mutationFn: ({

      id,

      input,

    }: {

      id: string;

      input: TransferFormValues;

    }) => transferStudentEnrollment(id, input),

    onSuccess: () => {

      invalidate();

      toast.success('Chuyển lớp thành công');

      setSheetMode(null);

      transferForm.reset({

        targetHomeroomClassId: '',

        transferredAt: todayIsoDate(),

        note: '',

      });

    },

    onError: (error) => {

      const apiError = getApiError(error);

      toast.error(getErrorMessage(apiError?.code, apiError?.message ?? 'Chuyển lớp thất bại'));

    },

  });



  const withdrawMutation = useMutation({

    mutationFn: ({

      id,

      input,

    }: {

      id: string;

      input: WithdrawFormValues;

    }) => withdrawStudentEnrollment(id, input),

    onSuccess: () => {

      invalidate();

      toast.success('Rút khỏi lớp thành công');

      setSheetMode(null);

      withdrawForm.reset({ leftAt: todayIsoDate(), note: '' });

    },

    onError: (error) => {

      const apiError = getApiError(error);

      toast.error(getErrorMessage(apiError?.code, apiError?.message ?? 'Rút lớp thất bại'));

    },

  });



  const years = yearsQuery.data?.items ?? [];

  const activeSemesterIds = useMemo(
    () => new Set(activeEnrollments.map((enrollment) => enrollment.semesterId)),
    [activeEnrollments],
  );

  const enrollSemesters = enrollSemestersQuery.data ?? [];
  const enrollableSemesters = useMemo(
    () => enrollSemesters.filter((semester) => !activeSemesterIds.has(semester.id)),
    [activeSemesterIds, enrollSemesters],
  );

  const transferClasses = useMemo(

    () =>

      (transferClassesQuery.data?.items ?? []).filter(

        (c) => c.id !== activeEnrollment?.homeroomClassId,

      ),

    [activeEnrollment?.homeroomClassId, transferClassesQuery.data?.items],

  );

  const enrollClasses = enrollClassesQuery.data?.items ?? [];

  const canEnroll =
    student.status === 'ACTIVE' &&
    !activeEnrollment &&
    activeEnrollments.length === 0;

  const canTransfer = activeEnrollment?.status === 'ACTIVE';

  const canWithdraw = activeEnrollment?.status === 'ACTIVE';



  return (

    <>

      <div className='flex flex-wrap gap-2'>

        {canEnroll ? (

          <Button onClick={() => setSheetMode('enroll')}>Ghi danh lớp</Button>

        ) : null}

        {canTransfer ? (

          <Button variant='outline' onClick={() => setSheetMode('transfer')}>

            Chuyển lớp

          </Button>

        ) : null}

        {canWithdraw ? (

          <Button variant='destructive' onClick={() => setSheetMode('withdraw')}>

            Rút khỏi lớp

          </Button>

        ) : null}

      </div>

      {activeEnrollment ? (
        <p className='mt-2 text-sm text-muted-foreground'>
          Học sinh đang học lớp {activeEnrollment.homeroomClassCode} (
          {activeEnrollment.semesterName}). Muốn đổi lớp trong cùng học kỳ, dùng{' '}
          <span className='font-medium text-foreground'>Chuyển lớp</span>.
        </p>
      ) : null}



      <Sheet open={sheetMode === 'enroll'} onOpenChange={(open) => !open && setSheetMode(null)}>

        <SheetContent>

          <SheetHeader>

            <SheetTitle>Ghi danh lớp hành chính</SheetTitle>

            <SheetDescription>

              Ghi danh {student.fullName} vào lớp trong học kỳ

            </SheetDescription>

          </SheetHeader>

          <form

            className='space-y-4 px-4'

            onSubmit={enrollForm.handleSubmit((values) =>

              enrollMutation.mutate({

                studentId: student.id,

                semesterId: values.semesterId,

                homeroomClassId: values.homeroomClassId,

                enrolledAt: values.enrolledAt,

                note: values.note || undefined,

              }),

            )}

          >

            <div className='space-y-2'>

              <Label htmlFor='enroll-year'>Năm học</Label>

              <select

                id='enroll-year'

                className={selectClassName}

                {...enrollForm.register('academicYearId', {

                  onChange: () => {

                    enrollForm.setValue('semesterId', '');

                    enrollForm.setValue('homeroomClassId', '');

                  },

                })}

              >

                <option value=''>Chọn năm học</option>

                {years.map((y) => (

                  <option key={y.id} value={y.id}>

                    {y.name}

                  </option>

                ))}

              </select>

            </div>

            <div className='space-y-2'>

              <Label htmlFor='enroll-semester'>Học kỳ</Label>

              <select

                id='enroll-semester'

                className={selectClassName}

                disabled={!enrollYearId}

                {...enrollForm.register('semesterId', {

                  onChange: () => enrollForm.setValue('homeroomClassId', ''),

                })}

              >

                <option value=''>Chọn học kỳ</option>

                {enrollableSemesters.map((s) => (

                  <option key={s.id} value={s.id}>

                    {s.name}

                  </option>

                ))}

              </select>

              {enrollYearId && enrollableSemesters.length === 0 ? (
                <p className='text-sm text-muted-foreground'>
                  Học sinh đã ghi danh tất cả học kỳ trong năm học này.
                </p>
              ) : null}

            </div>

            <div className='space-y-2'>

              <Label htmlFor='enroll-class'>Lớp hành chính</Label>

              <select

                id='enroll-class'

                className={selectClassName}

                disabled={!enrollSemesterId}

                {...enrollForm.register('homeroomClassId')}

              >

                <option value=''>Chọn lớp</option>

                {enrollClasses.map((c) => (

                  <option key={c.id} value={c.id}>

                    {c.code} — {c.name}

                  </option>

                ))}

              </select>

            </div>

            <div className='space-y-2'>

              <Label htmlFor='enrolledAt'>Ngày ghi danh</Label>

              <Input id='enrolledAt' type='date' {...enrollForm.register('enrolledAt')} />

            </div>

            <div className='space-y-2'>

              <Label htmlFor='enroll-note'>Ghi chú</Label>

              <Input id='enroll-note' {...enrollForm.register('note')} />

            </div>

            <SheetFooter>

              <Button type='submit' disabled={enrollMutation.isPending}>

                {enrollMutation.isPending ? 'Đang ghi danh...' : 'Ghi danh'}

              </Button>

            </SheetFooter>

          </form>

        </SheetContent>

      </Sheet>



      <Sheet open={sheetMode === 'transfer'} onOpenChange={(open) => !open && setSheetMode(null)}>

        <SheetContent>

          <SheetHeader>

            <SheetTitle>Chuyển lớp</SheetTitle>

            <SheetDescription>

              Chuyển từ {activeEnrollment?.homeroomClassCode} sang lớp khác cùng học kỳ

            </SheetDescription>

          </SheetHeader>

          <form

            className='space-y-4 px-4'

            onSubmit={transferForm.handleSubmit((values) => {

              if (!activeEnrollment) return;

              transferMutation.mutate({

                id: activeEnrollment.id,

                input: values,

              });

            })}

          >

            <div className='space-y-2'>

              <Label htmlFor='transfer-class'>Lớp mới</Label>

              <select

                id='transfer-class'

                className={selectClassName}

                {...transferForm.register('targetHomeroomClassId')}

              >

                <option value=''>Chọn lớp</option>

                {transferClasses.map((c) => (

                  <option key={c.id} value={c.id}>

                    {c.code} — {c.name}

                  </option>

                ))}

              </select>

            </div>

            <div className='space-y-2'>

              <Label htmlFor='transferredAt'>Ngày chuyển</Label>

              <Input id='transferredAt' type='date' {...transferForm.register('transferredAt')} />

            </div>

            <div className='space-y-2'>

              <Label htmlFor='transfer-note'>Ghi chú</Label>

              <Input id='transfer-note' {...transferForm.register('note')} />

            </div>

            <SheetFooter>

              <Button type='submit' disabled={transferMutation.isPending}>

                {transferMutation.isPending ? 'Đang chuyển...' : 'Chuyển lớp'}

              </Button>

            </SheetFooter>

          </form>

        </SheetContent>

      </Sheet>



      <Sheet open={sheetMode === 'withdraw'} onOpenChange={(open) => !open && setSheetMode(null)}>

        <SheetContent>

          <SheetHeader>

            <SheetTitle>Rút khỏi lớp</SheetTitle>

            <SheetDescription>

              Học sinh sẽ chuyển sang trạng thái đã rút khỏi lớp hiện tại

            </SheetDescription>

          </SheetHeader>

          <form

            className='space-y-4 px-4'

            onSubmit={withdrawForm.handleSubmit((values) => {

              if (!activeEnrollment) return;

              withdrawMutation.mutate({

                id: activeEnrollment.id,

                input: values,

              });

            })}

          >

            <div className='space-y-2'>

              <Label htmlFor='leftAt'>Ngày rút</Label>

              <Input id='leftAt' type='date' {...withdrawForm.register('leftAt')} />

            </div>

            <div className='space-y-2'>

              <Label htmlFor='withdraw-note'>Ghi chú</Label>

              <Input id='withdraw-note' {...withdrawForm.register('note')} />

            </div>

            <SheetFooter>

              <Button type='submit' variant='destructive' disabled={withdrawMutation.isPending}>

                {withdrawMutation.isPending ? 'Đang xử lý...' : 'Xác nhận rút lớp'}

              </Button>

            </SheetFooter>

          </form>

        </SheetContent>

      </Sheet>

    </>

  );

}

