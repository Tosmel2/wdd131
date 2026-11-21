const currentYear = new Date().getFullYear();

document.querySelector("#currentyear").textContent = currentYear;
const lastModified = document.querySelector("#lastModified");
lastModified.textContent = document.lastModified;


const temperature = 35;
const windSpeed = 5;


function calculateWindChill(temp, speed) {
    return 13.12 + (0.6215 * temp) - (11.37 * Math.pow(speed, 0.16)) + (0.3965 * temp * Math.pow(speed, 0.16));
}


let windChill = "N/A";

// Wind chill is calculated only when:
// Temperature <= 10°C
// Wind speed > 4.8 km/h

if (temperature <= 10 && windSpeed > 4.8) {

    windChill = calculateWindChill(temperature, windSpeed);

    windChill = `${windChill.toFixed(1)} °C`;

}


document.querySelector("#temperature").textContent = `${temperature} °C`;

document.querySelector("#wind-speed").textContent = `${windSpeed} km/h`;

document.querySelector("#wind-chill").textContent = windChill;
