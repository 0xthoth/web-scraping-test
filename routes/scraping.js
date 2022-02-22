var express = require("express");
const puppeteer = require("puppeteer");
var router = express.Router();

async function scrape(networkId) {
  console.log(`${networkId} - starting...`);
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  await page.goto("https://templar.finance/");

  await page.waitForSelector(".app");

  await page.evaluate((networkId) => {
    localStorage.setItem("defaultNetworkId", `${networkId}`);
  }, networkId);

  await page.reload();

  await page.waitForSelector(".recharts-pie");
  await new Promise((resolve) => setTimeout(resolve, 11000));

  const text = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll(".dsh-smy > .price > div"),
      (element) => element.textContent
    )
  );

  // await page.screenshot({ path: `${networkId}.png`, fullPage: true });

  browser.close();
  console.log("the end");

  console.log(text);

  return {
    chainId: networkId,
    globalMarketCap: text[0],
    globalTotalTreasuryBalance: text[1],
    globalTotalTreasuryVaultsBalance: text[2],
    globalCirculatingSupply: text[3],
    globalTotalSupply: text[4],
    globalBackingPerTem: text[5],
    globalRunway: text[6],
    marketCap: text[7],
    temPrice: text[8],
    apy: text[9],
    circulatingSupply: text[10],
    totalSupply: text[11],
    treasuryBalance: text[12],
    stakingReturn: text[13],
    stakedRate: text[14],
    wSwordPrice: text[15],
  };
}

router.get("/:networkId", async function (req, res, next) {
  const networkId = req.params.networkId;

  if (!networkId || !["56", "1285", "1666600000"].includes(networkId)) {
    res
      .status(500)
      .send("Something broke! we support networks: 56, 1285 and 1666600000.");
  }

  const values = await scrape(Number(networkId));
  const size = Object.keys(values).length;

  console.log(values);

  if (size < 16) {
    res.status(500).send("Something broke! incomplete information.");
  }

  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(values));
});

module.exports = router;
