function History() {

  const history = [

    {
      id: "BK000002",
      station: "Kovilpatti Charging Hub",
      date: "2026-08-02",
      energy: "32 kWh",
      amount: "₹480"
    },

    {
      id: "BK000003",
      station: "Madurai EV Station",
      date: "2026-07-25",
      energy: "28 kWh",
      amount: "₹420"
    },

    {
      id: "BK000004",
      station: "Chennai EV Station",
      date: "2026-07-18",
      energy: "24 kWh",
      amount: "₹340"
    }

  ];

  return (

    <div className="page">

      <h1>
        📊 Charging History
      </h1>

      <div className="history-table">

        <div className="history-header">

          <span>Booking ID</span>
          <span>Station</span>
          <span>Date</span>
          <span>Energy</span>
          <span>Amount</span>

        </div>

        {history.map((item) => (

          <div
            className="history-row"
            key={item.id}
          >

            <span>
              {item.id}
            </span>

            <span>
              {item.station}
            </span>

            <span>
              {item.date}
            </span>

            <span>
              {item.energy}
            </span>

            <span>
              {item.amount}
            </span>

          </div>

        ))}

      </div>

    </div>

  );
}

export default History;