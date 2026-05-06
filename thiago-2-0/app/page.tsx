import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Sigil } from '@/components/Sigil';
import { Wordmark } from '@/components/Wordmark';

export default async function LandingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/app');

  return (
    <main className="min-h-dvh bg-bg flex flex-col">
      <header className="px-6 pt-10 flex items-center justify-between safe-top">
        <div className="flex items-center gap-2.5">
          <Sigil size={28} />
          <Wordmark size="sm" />
        </div>
        <Link href="/login" className="label-mono-tight text-ink underline-offset-4 hover:underline">
          entrar
        </Link>
      </header>

      <section className="flex-1 flex flex-col justify-center px-6 py-12">
        <div className="max-w-md mx-auto w-full">
          <div className="label-mono mb-6">capítulo um · jornada</div>
          <h1 className="font-display text-7xl leading-[0.92] text-ink">
            Thiago
            <br />
            <span className="font-italic-display text-indigo">2.0</span>
          </h1>
          <p className="font-italic-display text-2xl text-inkSoft mt-6 leading-snug">
            tracking pessoal — glicemia, peso,<br/>
            treino, adesão. <span className="text-indigo">rumo à mesa</span>,<br/>
            junho de 2027.
          </p>

          <div className="divider my-10" />

          <ul className="space-y-3 text-inkSoft">
            <li className="flex items-baseline gap-3">
              <span className="label-mono">01</span>
              <span className="font-sans">Insulina e glicemia em ritual diário.</span>
            </li>
            <li className="flex items-baseline gap-3">
              <span className="label-mono">02</span>
              <span className="font-sans">Treino dividido em seis dias.</span>
            </li>
            <li className="flex items-baseline gap-3">
              <span className="label-mono">03</span>
              <span className="font-sans">Glicada de 11 → 7,5 até a cirurgia.</span>
            </li>
          </ul>

          <Link
            href="/login"
            className="mt-10 inline-flex w-full items-center justify-between rounded-full px-6 py-4 transition-colors"
            style={{ background: 'var(--c-ink)', color: 'var(--c-bg)' }}
          >
            <span className="label-mono-tight" style={{ color: 'var(--c-bg)', letterSpacing: '0.28em' }}>começar</span>
            <span aria-hidden className="font-italic-display text-2xl">→</span>
          </Link>
        </div>
      </section>

      <footer className="px-6 py-6 safe-bottom label-mono text-center">
        ◆ um por dia · sessenta no total ◆
      </footer>
    </main>
  );
}
