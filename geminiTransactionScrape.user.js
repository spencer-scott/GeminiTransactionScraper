// ==UserScript==
// @name        Gemini Credit Card Transaction Scraper
// @namespace   Violentmonkey Scripts
// @match       https://creditcard.exchange.gemini.com/credit-card/dashboard
// @require  	http://ajax.googleapis.com/ajax/libs/jquery/1.6.2/jquery.min.js
// @require     https://gist.github.com/raw/2625891/waitForKeyElements.js
// @grant       GM_download
// @grant       GM_xmlhttpRequest
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_deleteValue
// @grant       GM_addStyle
// @version     1.1
// @author      Laurence Mullen <github.com/laurence-rm>
// @description 6/1/2023, 5:09:16 PM - Scrape transaction history for a Gemini Credit Card
// ==/UserScript==

waitForKeyElements(".css-pgcj67", script);

function script() {
    "use strict";

    // Define the CSV header and initialize the data array
    const csvHeader =
        "Date,Merchant,Category,Account,Original Statement,Notes,Amount\n";
    let data = [csvHeader];

    // Add a "Download CSV" button to the activity page
    const downloadButton = document.createElement("button");
    downloadButton.innerText = "Download CSV";
    downloadButton.className = "e1fsl8uw0 css-1vwwht0 e1czpx482";
    //downloadButton.style = "margin-bottom:15px;width:150px;";
    downloadButton.addEventListener("click", () => {
        // Check if the transaction list has been selected and the "show more" button has been clicked
        var transactionList = document.getElementsByTagName("table")[0];
        const showMoreButtons = document.querySelector(".e1g47xw90").querySelectorAll("button");
        const showMoreButton = showMoreButtons[showMoreButtons.length - 1];
        var activityTab = document.querySelector(".css-ma5bwu").textContent;
        if (activityTab != "Transactions") {
            console.error("Not on Transactions page");
            return;
        }
        if (showMoreButton) {
            showMoreButton.click();
        } else {
            console.error("Could not expand button? Might already be open.");
        }

        // Scrape each row from the transaction table and add it to the data array
        const transactionRows = transactionList.querySelectorAll("tbody tr");
        transactionRows.forEach((row) => {
            const textData = row.querySelectorAll("td");

            const dateText = textData[1].textContent.trim();

            var date = null;
            if (dateText.slice(-3) == "ago") {
                date = new Date();
                date.setDate(date.getDate() - Number(dateText[0]));
            } else if (dateText == "Today") {
                date = new Date();
            } else {
                // if in Month day, year format
                date = new Date(dateText);
            }
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, "0");
            const day = date.getDate().toString().padStart(2, "0");
            const formattedDate = `${year}-${month}-${day}`;
            const merchant = textData[0].textContent.trim().replace(/\n/g, '');
            var processing = false;
            const amount = textData[3].textContent.trim().replace(/,/g, '').replace("Processing", function(token){processing = true; return "";});
            var dataRow = "";
            if (textData[2].textContent != "-") {
                const reward = textData[2].querySelector("p").textContent;
                const reward_percent =
                    textData[2].querySelector("strong").textContent;
                dataRow = `${formattedDate},${merchant},,Gemini Credit,,Reward: ${reward} @ ${reward_percent},-${amount}\n`;
            } else {
                dataRow = `${formattedDate},${merchant},,Gemini Credit,,Debt payment,${amount.slice(1)}\n`;
            }
            if (!processing) {
                data.push(dataRow);
                console.log(dataRow);
            }
        });

        console.log("Finished row scrape with " + data.length + " rows.");
        // Download the CSV file
        const csvData = data.join("");
        const csvBlob = new Blob([csvData], {
            type: "text/csv;charset=utf-8;",
        });
        const csvUrl = URL.createObjectURL(csvBlob);
        var timestamp = new Date().toISOString().replace(/:/g, "-");
        const fileName = "gemini_credit_transactions_" + timestamp + ".csv";
        //GM_download(csvUrl, fileName);
        const downloadLink = document.createElement("a");
        downloadLink.href = csvUrl;
        downloadLink.download = fileName;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        // Reset the data array
        data = [];
    });
    document.querySelector(".e1g47xw90").appendChild(downloadButton);

    return false;
}
