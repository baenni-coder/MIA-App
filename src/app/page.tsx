export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-5xl w-full">
        <h1 className="text-4xl font-bold mb-8 text-center">
          MIA-App
        </h1>
        <p className="text-xl text-center text-muted-foreground mb-8">
          Jahresplanung für Medien, Informatik und Anwendungskompetenzen
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/login"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
          >
            Anmelden
          </a>
          <a
            href="/register"
            className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition"
          >
            Registrieren
          </a>
        </div>
      </div>
    </div>
  );
}
