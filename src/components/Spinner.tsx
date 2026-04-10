export function Spinner() {
  return (
    <div className="cortex-loader">
      <div className="circle">
        <div className="dot" />
        <div className="outline" />
      </div>
      <div className="circle">
        <div className="dot" />
        <div className="outline" />
      </div>
      <div className="circle">
        <div className="dot" />
        <div className="outline" />
      </div>
      <div className="circle">
        <div className="dot" />
        <div className="outline" />
      </div>
    </div>
  )
}

export function PageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <Spinner />
    </div>
  )
}
