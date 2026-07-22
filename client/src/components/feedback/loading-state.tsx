export function LoadingState({ message = 'Đang tải...' }: { message?: string }) {
  return (
    <div className='flex min-h-40 flex-col items-center justify-center gap-2 text-muted-foreground'>
      <div className='size-6 animate-spin rounded-full border-2 border-primary border-t-transparent' />
      <p className='text-sm'>{message}</p>
    </div>
  );
}
