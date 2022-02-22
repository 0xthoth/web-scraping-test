var express = require("express");
const puppeteer = require("puppeteer");
var router = express.Router();

const holderConfig = {
  56: [
    "https://bscscan.com/token/0x8C9827Cd430d945aE5A5c3cfdc522f8D342334B9",
    "https://bscscan.com/token/0x66972b14e525374DCE713ce14c8D080f3036dAbb",
  ],
  1285: [
    "https://moonriver.moonscan.io/token/0x8C9827Cd430d945aE5A5c3cfdc522f8D342334B9",
    "https://moonriver.moonscan.io/token/0xe1b9b34b03ec34b0802398b7669de6d0d43c9871",
  ],
  1666600000: [
    "https://explorer.harmony.one/address/0x8646029f997cdb2cf51bde492b15026aee198c3e",
    "https://explorer.harmony.one/address/0xc7de4e4227f00e91cab422faa5630d40aecdb6a4",
  ],
};

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
  await new Promise((resolve) => setTimeout(resolve, 9500));

  const text = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll(".dsh-smy > .price > div"),
      (element) => element.textContent
    )
  );

  browser.close();
  console.log("the end");

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

async function scrapeHolder(networkId) {
  console.log(`${networkId} - holder start...`);

  const browser = puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const createInstance = async (url) => {
    let real_instance = await browser;
    let page = await real_instance.newPage();
    await page.goto(url);

    let text = "";

    try {
      if (networkId !== 1666600000) {
        await new Promise((resolve) => setTimeout(resolve, 9000));
        const last = await page.$("#sparkholderscontainer");
        const prev = await page.evaluateHandle(
          (el) => el.previousElementSibling,
          last
        );
        text = await (await prev?.getProperty("innerHTML"))?.jsonValue();
        console.log(text);
      } else {
        // for Hamony network
        await new Promise((resolve) => setTimeout(resolve, 9500));

        const [span] = await page.$x("//span[contains(., 'Holders')]");
        const prev = await page.evaluateHandle((el) => el?.nextSibling, span);

        text = await (await prev?.getProperty("textContent"))?.jsonValue();
      }
    } catch (e) {
      console.log(e);
      await page.close();
    }

    await page.close();

    return text?.trim()?.split(" ")[0]?.replace(/,/g, "") || "0";
  };

  const data = await Promise.all(
    holderConfig[networkId].map((url) => createInstance(url))
  );

  console.log("holder end");

  return {
    holderSword: data[0],
    holderWsword: data[1],
  };
}

router.get("/:networkId", async function (req, res, next) {
  const networkId = req.params.networkId;

  if (!networkId || !["56", "1285", "1666600000"].includes(networkId)) {
    res
      .status(500)
      .send("Something broke! we support networks: 56, 1285 and 1666600000.");
    return;
  }

  const data = await Promise.all([
    scrape(Number(networkId)),
    scrapeHolder(Number(networkId)),
  ]);

  const values = data.reduce(
    (prev, cur) => ({
      ...prev,
      ...cur,
    }),
    {}
  );

  const size = Object.keys(values).length;

  if (size < 16) {
    res.status(500).send("Something broke! incomplete information.");
    return;
  }

  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(values));
  return;
});

module.exports = router;
