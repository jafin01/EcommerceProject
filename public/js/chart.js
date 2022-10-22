
axios({
  method: "post",
  url: "/test",
  data: {}
})
  .then((response) => {
    document.getElementById('totalSales').innerHTML = "₹ " + response.data.annualSales
    const labels = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'Sept',
      'Oct',
      'Nov',
      'Dec',
    ];

    let lineData = {
      labels: labels,
      datasets: [{
        label: 'Monthly sales',
        backgroundColor: 'rgb(255, 99, 132)',
        borderColor: 'rgb(255, 99, 132)',
        data: response.data.salesOfTheYear,
      }]
    };

    const configLine = {
      type: 'line',
      data: lineData,
      options: {}
    };

    const myChart = new Chart(
      document.getElementById('myChart'),
      configLine
    );

    const doughnutData = {
      labels: [
        'Q1',
        'Q2',
        'Q3',
        'Q4'
      ],
      datasets: [{
        label: 'My First Dataset',
        data: response.data.quarterlySales,
        backgroundColor: [
          'rgb(255, 99, 132)',
          'rgb(54, 162, 235)',
          'rgb(255, 205, 86)',
          'rgb(45, 170, 153'
        ],
        hoverOffset: 4
      }]
    };

    const configDoughnut = {
      type: 'doughnut',
      data: doughnutData,
    };

    const doughnutChart = new Chart(
      document.getElementById('doughnut'),
      configDoughnut
    )

  })



















//   <//script>




// <script>






