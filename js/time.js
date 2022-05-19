const options = {
  method: "GET",
  headers: {
    "X-RapidAPI-Host": "livetime.p.rapidapi.com",
    "X-RapidAPI-Key": "aa4a9e28fdmsh24e8338e2ae0ba7p104b0bjsna4ed2d34bd32",
  },
};

async function fetchDate() {
  let date, time;
  await fetch("https://livetime.p.rapidapi.com/time", options)
    .then((res) => res.json())
    .then((res) => {
      date = res.date;
      time = res.time + " " + res.ampm;
      console.log("api call");
    })
    .catch((err) => console.error(err));
  return { date, time };
}

await fetchDate();
export { fetchDate };
