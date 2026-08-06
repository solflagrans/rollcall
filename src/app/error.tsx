"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main className="login-page"><section className="login-card" style={{ textAlign: "center" }}><h1>Что-то пошло не так</h1><p>Не удалось загрузить данные. Попробуйте ещё раз.</p><button className="button primary" onClick={reset}>Повторить</button></section></main>; }
