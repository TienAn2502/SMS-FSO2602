export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className='flex min-h-40 flex-col items-center justify-center gap-2 text-center'>
      <p className='font-medium'>{title}</p>
      {description ? (
        <p className='max-w-sm text-sm text-muted-foreground'>{description}</p>
      ) : null}
    </div>
  );
}
