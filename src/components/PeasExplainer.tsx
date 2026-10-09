import { PageTitle } from './shared';
export function PeasExplainerView() {
  return (
    <>
      <PageTitle title="How the valuation works">
        Choose between the video’s demonstrated two-component calculation and a separate historical
        P/E comparison.
      </PageTitle>
      <article className="guide">
        <section>
          <h2>The video’s demonstrated EMP arithmetic</h2>
          <p>
            Start with a supplied profit-insensitive baseline B and an earlier matched price/EPS
            reference. Earnings sensitivity is (reference price − B) ÷ reference TTM EPS.
          </p>
          <div className="formula">
            EMP = B + updated TTM EPS × earnings sensitivity
            <br />
            EMP Low / High = EMP ± k × previous-quarter price standard deviation
          </div>
          <p>
            The 11:07 slide uses reference price ₹200, reference EPS ₹10 and baseline ₹120.
            Sensitivity is 8, so updated EPS ₹15 produces EMP ₹240. At13:30 the slide uses k=3 and
            price deviation ₹10 to produce ₹210 and ₹270.
          </p>
          <p>
            The baseline remains a required input; the public material does not disclose the
            proprietary method for deriving it for a company. Price deviation is measured in rupees
            and must not be replaced by P/E dispersion. If you calculate deviation from your own
            quarter prices, choose and record the sample or population denominator.
          </p>
          <a
            href="https://www.youtube.com/watch?v=CboJkEiyR08&t=667"
            target="_blank"
            rel="noreferrer"
          >
            View the worked video example
          </a>
        </section>
        <section>
          <h2>What Vivekam’s public product pages establish</h2>
          <p>
            Snapshot provides company information; Stock Forecaster shows expected, high and low
            values for a forward quarter; Top Ranks combines growth and scope to grow. Portfolio
            services reassess holdings using TTM results. The live tools require account access.
          </p>
          <p>
            These product descriptions do not publish a regression formula or promise one universal
            coverage percentage. The video’s displayed96.26% is a reported historical result; it is
            not an accuracy statistic for this workspace.
          </p>
          <a href="https://www.vivekam.co.in/stock-services/" target="_blank" rel="noreferrer">
            Vivekam stock services
          </a>
          <p>
            <a
              href="https://www.vivekam.co.in/wp-content/uploads/2025/04/20VivekamPMSDraftDisclosure.pdf"
              target="_blank"
              rel="noreferrer"
            >
              Vivekam’s2025 PMS disclosure
            </a>
          </p>
        </section>
        <section>
          <h2>Start with earnings, then choose a multiple</h2>
          <p>
            TTM EPS is earnings per share over the latest four consecutive quarters. A historical
            mean P/E describes what investors have paid for those earnings over a chosen period.
          </p>
          <div className="formula">Model value per share = TTM EPS × historical mean P/E</div>
          <p>
            For example, EPS of ₹5 and mean P/E of 20 produce a model value of ₹100. That value
            changes if earnings, the historical period or the multiple changes.
          </p>
        </section>
        <section>
          <h2>Understand the lower and upper bands</h2>
          <p>
            The sample standard deviation measures variation in the same historical P/E observations
            used for the mean.
          </p>
          <div className="formula">
            Lower = EPS × max(0, mean P/E − k × sample deviation)
            <br />
            Upper = EPS × (mean P/E + k × sample deviation)
          </div>
          <p>
            At EPS ₹5, mean P/E 20, deviation 3 and k = 1.96, the range is ₹70.60 to ₹129.40. It is
            a model range, not guaranteed support or resistance.
          </p>
          <p>
            A normal distribution places about 95% of its observations within ±1.96 standard
            deviations. This assumption does not establish a 95% probability of a stock recovering,
            and it is not a confidence interval for an estimated mean or a measured backtest hit
            rate.
          </p>
          <a
            href="https://www.itl.nist.gov/div898/handbook/eda/section3/eda3671.htm"
            target="_blank"
            rel="noreferrer"
          >
            NIST: standard normal distribution
          </a>
        </section>
        <section>
          <h2>What about the method in the video?</h2>
          <p>
            The{' '}
            <a href="https://www.youtube.com/watch?v=CboJkEiyR08" target="_blank" rel="noreferrer">
              reference video from Vivekam
            </a>{' '}
            discusses an expected market price with profit-sensitive and profit-insensitive
            components. It describes part of that method as proprietary intellectual property.
          </p>
          <p>
            This app implements the reproducible historical P/E model in the repository. It cannot
            claim to reproduce the proprietary EMP algorithm, its coefficients, or its stated
            performance.
          </p>
        </section>
        <section>
          <h2>Use comparable financial inputs</h2>
          <ul>
            <li>
              Use a consistent reporting basis, such as consolidated earnings attributable to
              ordinary shareholders.
            </li>
            <li>
              Record the financial period. Do not combine current prices with obsolete or
              split-unadjusted earnings without reviewing them.
            </li>
            <li>
              Use weighted-average shares for the relevant period. If shares changed, prefer
              reported comparable EPS over the raw profit shortcut.
            </li>
            <li>
              Use historical P/E observations from a consistent period and sampling frequency.
              Today’s P/E is not a historical mean.
            </li>
            <li>
              Negative or zero TTM earnings make this P/E method unavailable. Zero P/E dispersion is
              valid, but produces no z-score.
            </li>
          </ul>
          <a
            href="https://www.ifrs.org/issued-standards/list-of-standards/ias-33-earnings-per-share.html/"
            target="_blank"
            rel="noreferrer"
          >
            IAS 33: earnings per share and weighted-average shares
          </a>
        </section>
        <section>
          <h2>Know where the data came from</h2>
          <p>
            <strong>Example data:</strong> the bundled stock values and historical observations have
            no verifiable source dates. They are labeled examples throughout the app.
          </p>
          <p>
            <strong>User inputs:</strong> imported or edited models store your source link and
            financial period when supplied. They are not automatically verified by the app.
          </p>
          <p>
            <strong>Provider quotes:</strong> Yahoo Finance supplies optional NSE/BSE quotes and
            their market timestamps. They may be delayed. Failed or old quotes are shown as stale or
            unavailable and cannot silently replace model inputs.
          </p>
          <p>
            Automatic financial-statement ingestion is not configured. For a production financial
            feed, connect a licensed provider that supplies attributable earnings, share
            adjustments, financial periods, and a matching historical P/E series.
          </p>
        </section>
        <section>
          <h2>Read percentages correctly</h2>
          <p>
            “Price vs. model” uses model value as the denominator. A ₹80 price against a ₹100 model
            is −20%. “Move to model” uses current price as the denominator: the same example needs a
            +25% price change to reach ₹100.
          </p>
          <p>
            Scenario growth compounds EPS over future quarters while leaving P/E assumptions
            unchanged. It is hypothetical and does not project a traded share price.
          </p>
        </section>
      </article>
    </>
  );
}
