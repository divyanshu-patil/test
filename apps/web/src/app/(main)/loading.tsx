export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="mx-auto w-full max-w-[470px] space-y-4 px-4 sm:px-0">
      <div className="h-6 w-24 skeleton rounded" />
      <div className="skeleton aspect-square rounded-card" />
    </div>
  );
}
