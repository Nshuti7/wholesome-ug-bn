// limiter-test.js
const axios = require("axios");

(async () => {
  for (let i = 1; i <= 105; i++) {
    try {
      const res = await axios.post(
        "http://localhost:5000/api/pledge",
        {
          name: "Spam",
          phone: "+250123",
          motive: "spam",
          amount: 1,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      console.log(`#${i} → ${res.status}`);
    } catch (err) {
      // If the request was made and the server responded
      if (err.response) {
        console.log(`#${i} → ${err.response.status}`);
      } else {
        // Something else went wrong (network, timeout, etc)
        console.log(`#${i} → Network/Error: ${err.message}`);
      }
    }
  }
})();
