export const metadata = { title: "About us" }

export default function AboutPage() {
  return (
    <>
      <h1>About Dealker</h1>
      <p className="text-slate-500">India&apos;s marketplace for phones and electronics.</p>
      <p>
        Dealker brings buyers, verified sellers and repair shops together in one app. You can buy new and
        refurbished phones and accessories, bid in live auctions, sell your old phone for a fair price,
        exchange it when you upgrade, and get quotes from repair shops near you.
      </p>
      <h2>What you can do</h2>
      <ul>
        <li>Shop phones, accessories and electronics from Dealker and verified sellers.</li>
        <li>Join live auctions and win devices at a price you choose.</li>
        <li>Sell or exchange your old phone and get paid after inspection.</li>
        <li>Book a repair and compare offers from nearby repair shops.</li>
      </ul>
      <h2>Contact</h2>
      <p>
        Email <a className="text-indigo-700" href="mailto:support@dealker.in">support@dealker.in</a>.
      </p>
    </>
  )
}
