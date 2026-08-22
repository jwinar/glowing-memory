/* ------------------------------------------------------------------
   App — mounts the page. Component files above register themselves on
   `window`, so this stays a thin composition root.
------------------------------------------------------------------ */

const App = () => (
  <main className="relative w-full bg-black">
    <window.Hero />
    <window.Capabilities />
    <window.Calculator />
    <window.Footer />
  </main>
);

window.App = App;

const container = document.getElementById("root");
const root = ReactDOM.createRoot(container);
root.render(<App />);
window.dismissBoot();
