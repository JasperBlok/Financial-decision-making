"use strict";

// Graph dimensions
const width = 500;
const height = 300;
const margin = {
    top: 30,
    right: 70,
    bottom: 30,
    left: 70
}

// Element references
const svgTime = d3.select("#time_chart");
const svgTot = d3.select("#line_total");
const btnStart = d3.select("button");

// create Time graph elements
const axisContainer = svgTime.append("g").attr("id", "axisContainer");
const xAxis = axisContainer.append("g").attr("id", "xAxis");
const yAxis = axisContainer.append("g").attr("id", "yAxis");
const pathContainer = axisContainer.append("g").attr("id", "pathContainer");

// Data variables
let dataJaarinkomen;
let dataInkomsten;
let dataUitgaven;
let dataUren;
let dataUurlonen = {}
let data = [];

// Visualisation influencing variables
const startLeeftijd = 18;
const eindLeeftijd = 67
let speed = 500;
let tickInterval = null;
const colors = ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93"];

// Enumerators
const car = {
    MINI_KLASSE: "mini",
    COMPACTE_KLASSE: "compact",
    KLEINE_MIDDENKLASSE: "klein"
}
const house = {
    FLAT: "flat",
    TUSSENWONING: "tussenwoning",
    HOEKWONING: "hoekwoning",
    TWEE_ONDER_EEN_KAP: "twee_onder_een_kap",
    VRIJSTAAND: "vrijstaand"
}
const belegging = {
    AANDEEL: "aandelen",
    VASTGOED: "vastgoed",
    STAAT: "staatsobligaties",
    BEDRIJF: "bedrijfsobligaties"
}
const risico = {
    LAAG: 0,
    GEMIDDELD: 2,
    HOOG: 10
}

// Scales
let xScale = getLinearScale(startLeeftijd, startLeeftijd + 1, 0, width - margin.left - margin.right);
let yScale = getLinearScale(1000, 0, 0, height - margin.top - margin.bottom); // min and max of yScale are inverted because the lowest value should appear at the bottom
const lineValues = d3.line()
    .x((d) => { return xScale(d.year); })
    .y((d) => { return yScale(d.total); });
let yMin = 0;
let yMax = 1000000;

// retrieve data
(async function () {
    dataJaarinkomen = await d3.csv("data/gemiddeld-persoonlijk-jaarinkomen-per-1000-euro-2017.csv");
    dataUren = await d3.csv("data/gemiddeld-arbeidsuren.csv")
    let dataInUit = await d3.json("data/inkomsten-en-uitgaven.json");
    dataInkomsten = dataInUit.inkomsten;
    dataUitgaven = dataInUit.uitgaven;

    calcUurlonen();

    btnStart.attr("disabled", null);

    console.log(dataJaarinkomen);
    console.log(dataUren);
    console.log(dataUurlonen);
    console.log(dataInkomsten);
    console.log(dataUitgaven);

    // set graph attributes
    initializeGraph();
})();


function initializeGraph() {
    svgTime.attr("viewBox", `0 0 ${width} ${height}`);

    axisContainer.attr("transform", `translate(${margin.left}, ${margin.top})`)
        .style("color", "white");

    xAxis.attr("transform", `translate(0, ${height - margin.top - margin.bottom})`)
        .call(d3.axisBottom(xScale));

    yAxis.call(d3.axisLeft(yScale));

    // De nederlander heeft gemiddeld een woonoppervlak van 65 m2 https://www.beaufortmakelaars.nl/nederlander-heeft-gemiddeld-65-m2-woonoppervlakte/.
    // first general profile
    setProfiles();
}


function setProfiles() {
    data.push(
        createProfile("couple", true)
            .addPerson("m", true, 40, 18)
            .addPerson("v", true, 30, 18)
            .addPerson("m", false, 0, 2)
            .addHouse(house.FLAT, 314000, 82.30, true, true)
            .addCar(car.MINI_KLASSE, 8000)
            .setZorgverzekering(true, 0, false)
            .setOverigVerzekering(38)
            .setRecreationBudget(200, 300, 17, 19),
        createProfile("belegger", false)
            .addPerson("m", true, 40, 18)
            .addHouse(house.TUSSENWONING, 314000, 113.40, true, true)
            .setZorgverzekering(true, 0, true)
            .setOverigVerzekering(0)
            .setRecreationBudget(100, 150, 17, 19)
            .setBelegRisico(risico.GEMIDDELD),
        createProfile("house", false)
            .addPerson("m", true, 40, 18)
            //.addHouse(house.TUSSENWONING, 314000, 113.40, false, true)
            .setZorgverzekering(false, 500, false)
            .setOverigVerzekering(36)
            .setRecreationBudget(100, 200, 17, 19),
        createProfile("house2", false)
            .addPerson("m", true, 40, 18)
            //.addHouse(house.TUSSENWONING, 314000, 113.40, false, true)
            .setZorgverzekering(false, 500, false)
            .setOverigVerzekering(36)
            .setRecreationBudget(100, 200, 17, 19),
    );
}


function startVis() {
    if (tickInterval != null) {
        clearInterval(tickInterval);
        tickInterval = null;
    }
    else {
        tick();
        tickInterval = setInterval(tick, speed);
    }
}


function restart() {
    // stop current ticks
    clearInterval(tickInterval);
    tickInterval = null;
    
    // reset variables
    yMax = 1000000;
    data = []
    setProfiles();
    
    // start visualization
    startVis()
}


function tick() {
    if (data[0].data.length === 50) {
        clearInterval(tickInterval);
        tickInterval = null;
    }
    const costPerM2 = 365000 / +dataUitgaven.woninghuur.oppervlak.woonhuizen;

    // Do calculations for every profile
    for (let i = 0; i < data.length; i++) {
        let entry = data[i];
        let values = createYearData(entry.data[entry.data.length - 1].year + 1, entry.data[entry.data.length - 1].savings, entry.data[entry.data.length - 1].pension);
        
        // the average price of a house is 365.000 :https://www.nvm.nl/nieuws/2021/cijfers-vierde-kwartaal/#:~:text=14%20januari%202021-,De%20verkoopprijs%20van%20de%20gemiddelde%20verkochte%20woning%20in%20het%20bestaande,een%20jaar%20boven%20de%2011%25.
        // with the average surface area being dataUitgaven.uitgaven.woninghuur.oppervlak.woonhuizen (=113,40 m2),
        // the average price per m2 would be 365.000 / 113,40 = 3.218,69...
        // we are using this price calculation for determining how much a house will cost, plus a small factor of randomness.
        
        
        let cost = 365000;
        // changes to the profile
        switch (entry.profile) {
            case "house":
                if (values.savings >= cost / 10 && entry.bezittingen.houses.length === 0) {
                    let relief = cost / 30
                    buyHouse(entry, values, house.TUSSENWONING, cost, 113.40, 10, relief)
                    entry.bezittingen.houses.forEach(h => {
                        h.living = false;
                    })
                    entry.bezittingen.houses[entry.bezittingen.houses.length -1].living = true;
                }
                break;
            case "house2":
                if (values.savings >= cost / 20 && entry.bezittingen.houses.length === 0) {
                    let relief = cost / 30
                    buyHouse(entry, values, house.TUSSENWONING, cost, 113.40, 20, relief)
                    entry.bezittingen.houses.forEach(h => {
                        h.living = false;
                    })
                    entry.bezittingen.houses[entry.bezittingen.houses.length -1].living = true;
                }
                break;
            case "belegger":
                let inleg = values.savings * 0.10;
                inleg = values.savings - inleg < 5000 ? values.savings - 5000 : inleg;
                inleg = inleg < 0 ? 0 : inleg;
                entry.beleg(true, inleg, belegging.AANDEEL);
                values.savings -= inleg;
                break;
            default:
                break;
        }


        // Calculate income and expenses
        // inkomsten en uitgaven van woningen
        entry.bezittingen.houses.forEach(h => {
            if (h.living) {
                if (h.rental) {
                    values.uitgaven.huiskosten.huur = calcHuur(h) * 4
                    values.uitgaven.huiskosten.total += values.uitgaven.huiskosten.huur;
                }
                else {
                    values.uitgaven.huiskosten.gas = calcGaskosten(h) * 12;
                    values.uitgaven.huiskosten.water = calcWaterkosten(entry.people) * 12;
                    values.uitgaven.huiskosten.elektriciteit = calcElektriciteitskosten(entry.people) * 12;
                    values.uitgaven.huiskosten.total += values.uitgaven.huiskosten.gas;
                }
            }
            else if (h.rental) {
                values.inkomsten.huisverhuur += calcHuur(h) * 4
            }
        });
        // omdat deze persoonsgebonden zijn maar één keer tellen en dus niet in de loop toevoegen
        values.uitgaven.huiskosten.total += values.uitgaven.huiskosten.water + values.uitgaven.huiskosten.elektriciteit;        


        // rendement op aandelen uitkeren
        calcInvestmentInterest(entry.beleggingen)


        // inkomsten berekenen
        values.inkomsten.salaries = calcSalaries(entry.people) * 12;
        // geld opzij gezet voor pension van salaris. Meestal wordt rond de 20% opzij gezet van het salaris. https://www.rabobank.nl/particulieren/pension/vuistregels-pension
        let pension = values.inkomsten.salaries * 0.2;
        values.pension += pension;
        values.inkomsten.kinderbijslag = calcKinderbijslag(entry.people) * 4;
        // total
        values.inkomsten.total += values.inkomsten.salaries + values.inkomsten.huisverhuur + values.inkomsten.kinderbijslag - pension;

        

        // uitgaven berekenen
        calcDebts(values, entry.debts);
        // verzekeringen
        values.uitgaven.verzekeringen.zorgverzekering = calcZorgverzekering(entry.verzekeringen.zorgverzekering, entry.people) * 12;
        values.uitgaven.verzekeringen.overige = entry.verzekeringen.overige * 12
        values.uitgaven.verzekeringen.total += values.uitgaven.verzekeringen.zorgverzekering + values.uitgaven.verzekeringen.overige;
        // belastingen
        values.uitgaven.belastingen.inkomensbelasting = calcInkomstenbelasting(values.inkomsten);
        values.uitgaven.belastingen.vermogensbelasting = calcVermogensbelasting(values.savings, entry.bezittingen, entry.married);
        values.uitgaven.belastingen.total += values.uitgaven.belastingen.inkomensbelasting + values.uitgaven.belastingen.vermogensbelasting;
        // overige uitgaven
        values.uitgaven.overige.voeding = calcVoedingskosten(entry.people); //uitgaven aan voeding over een jaar
        values.uitgaven.overige.media = dataUitgaven.media.kosten * 12; //uitgaven aan media zoals: tv, internet, telefoon
        values.uitgaven.overige.autos = calcAutokosten(entry.bezittingen.cars); //uitgaven aan auto gerelateerde zaken
        values.uitgaven.overige.kleding = values.inkomsten.total * dataUitgaven.kleding.percentage * 0.01 //percentage van inkomen wat besteed wordt aan kleding in een gezin
        values.uitgaven.overige.reservering = values.inkomsten.total * dataUitgaven.reserveringsuitgaven.percentage * 0.01 //reserveringsuitgaven exclusief kleding
        values.uitgaven.overige.total += values.uitgaven.overige.voeding + values.uitgaven.overige.kleding + values.uitgaven.overige.media + values.uitgaven.overige.reservering + values.uitgaven.overige.autos;
        // total
        values.uitgaven.total += values.uitgaven.verzekeringen.total + values.uitgaven.belastingen.total + values.uitgaven.huiskosten.total + values.uitgaven.overige.total + values.uitgaven.debts.total;
        // expenses to recreation
        values.uitgaven.overige.recreation = calcRecreatieUitgaven(values.inkomsten.total, values.uitgaven.total, entry.recreation);
        values.uitgaven.total += values.uitgaven.overige.recreation;


        // vermogen in bezittingen berekenen
        values.vermogen.cars = calcAutoVermogen(entry.bezittingen.cars);
        values.vermogen.houses = calcHuisVermogen(entry.bezittingen.houses);
        values.vermogen.beleggingen = calcInvestmentCapital(entry.beleggingen);
        values.vermogen.total = values.vermogen.total + values.vermogen.cars + values.vermogen.houses + values.vermogen.beleggingen - values.vermogen.debts;



        // inkomsten en uitgaven optellen
        values.savings += values.inkomsten.total - values.uitgaven.total
        // spaarrente berkenen
        values.inkomsten.spaarrente = calcSpaarrente(values.savings)
        values.inkomsten.total += values.inkomsten.spaarrente;
        values.savings += values.inkomsten.spaarrente;
        // totaal berekenen
        values.total = values.savings + values.pension + values.vermogen.total;

        entry.data.push(values)
        yMax = values.total > yMax ? values.total : yMax;
        yMin = values.total < yMin ? values.total : yMin;
    }

    console.log(data)

    xAxis.transition()
        .duration(speed)
        .ease(d3.easeLinear)
        .call(d3.axisBottom(xScale.domain([startLeeftijd, data[0].data.length + startLeeftijd - 1])));

    yAxis.transition()
        .duration(speed)
        .ease(d3.easeLinear)
        .call(d3.axisLeft(yScale.domain([yMax, yMin])));


    let lines = pathContainer.selectAll("g").data(data);

    // update
    lines.select("path").transition()
        .duration(speed)
        .ease(d3.easeLinear)
        .attrTween("d", function (d) {
            return pathTween(lineValues(d.data), 1, this)()
        });
    lines.select("text").transition()
        .duration(speed)
        .ease(d3.easeLinear)
        .attr("x", (d) => {return xScale(d.data[d.data.length - 1].year) + 5; })
        .attr("y", (d) => {return yScale(d.data[d.data.length - 1].total) + 5; })
    
    // enter
    let enter = lines.enter()
        .append("g")
        .attr("id", (d) => { return `${d.profile}` })
    enter.append("path")
        .classed("line", true)
        .attr("d", `M${xScale(0)},${yScale(0)} L${xScale(0)},${yScale(0)}`)
        .style("stroke", (d, i) => { return colors[i]; })
        .on("click", selectLine)
        .transition()
        .duration(speed)
        .ease(d3.easeLinear)
        .attrTween("d", function (d) {
            return pathTween(lineValues(d.data), 1, this)()
        });
    enter.append("text")
        .classed("label", true)
        .html((d) => {return `${d.profile}`; })
        .style("fill", (d, i) => { return colors[i]; })
        .transition()
        .duration(speed)
        .ease(d3.easeLinear)
        .attr("x", (d) => {return xScale(d.data[d.data.length - 1].year) + 10; })
        .attr("y", (d) => {return yScale(d.data[d.data.length - 1].total); })
    
    // exit
    let exit = lines.exit().remove();
}


function getLinearScale(minData, maxData, minRange, maxRange) {
    let scale = d3.scaleLinear()
        .domain([minData, maxData])
        .range([minRange, maxRange]);
    return scale;
}


function selectLine(e, d) {
    console.log("click! ", e, d, this);
    d3.select(".selected")
        .classed("selected", false)
        .style("stroke-width", null);
    d3.select(this)
        .classed("selected", true)
        .style("stroke-width", 3);
}


// calculates how much € (*1000) a person makes in a year by working 1 hour per week
function calcUurlonen() {
    for (let i = 15; i < 68; i++) {
        let obj = {}

        if (i < 20) {
            obj.m = +dataJaarinkomen[0].Man
            obj.v = +dataJaarinkomen[0].Vrouw;
        }
        else if (i < 25) {
            obj.m = +dataJaarinkomen[1].Man;
            obj.v = +dataJaarinkomen[1].Vrouw;
        }
        else if (i < 30) {
            obj.m = +dataJaarinkomen[3].Man;
            obj.v = +dataJaarinkomen[3].Vrouw;
        }
        else if (i < 35) {
            obj.m = +dataJaarinkomen[4].Man;
            obj.v = +dataJaarinkomen[4].Vrouw;
        }
        else if (i < 40) {
            obj.m = +dataJaarinkomen[5].Man;
            obj.v = +dataJaarinkomen[5].Vrouw;
        }
        else if (i < 45) {
            obj.m = +dataJaarinkomen[6].Man;
            obj.v = +dataJaarinkomen[6].Vrouw;
        }
        else if (i < 50) {
            obj.m = +dataJaarinkomen[7].Man;
            obj.v = +dataJaarinkomen[7].Vrouw;
        }
        else if (i < 55) {
            obj.m = +dataJaarinkomen[8].Man;
            obj.v = +dataJaarinkomen[8].Vrouw;
        }
        else if (i < 60) {
            obj.m = +dataJaarinkomen[9].Man;
            obj.v = +dataJaarinkomen[9].Vrouw;
        }
        else if (i < 65) {
            obj.m = +dataJaarinkomen[10].Man;
            obj.v = +dataJaarinkomen[10].Vrouw;
        }
        else {
            obj.m = +dataJaarinkomen[11].Man;
            obj.v = +dataJaarinkomen[11].Vrouw;
        }

        if (i < 25) {
            obj.m = obj.m / +dataUren[0].Man
            obj.v = obj.v / +dataUren[0].Vrouw
        }
        else if (i < 35) {
            obj.m = obj.m / +dataUren[1].Man
            obj.v = obj.v / +dataUren[1].Vrouw
        }
        else if (i < 45) {
            obj.m = obj.m / +dataUren[2].Man
            obj.v = obj.v / +dataUren[2].Vrouw
        }
        else if (i < 55) {
            obj.m = obj.m / +dataUren[3].Man
            obj.v = obj.v / +dataUren[3].Vrouw
        }
        else {
            obj.m = obj.m / +dataUren[4].Man
            obj.v = obj.v / +dataUren[4].Vrouw
        }

        dataUurlonen[`${i}`] = obj;
    }
}


// returns new profile to do calculations with
function createProfile(name, married) {
    let profile = {
        profile: `${name}`,
        married: married,
        people: [],
        recreation: {
            min: 0,
            max: 0,
            min_percent: 0,
            max_percent: 0,
        },
        bezittingen: {
            houses: [],
            cars: [],
            other: []
        },
        beleggingen: {
            risico: risico.GEMIDDELD,
            aandelen: 0,
            vastgoed: 0,
            staatsobligaties: 0,
            bedrijfsobligaties: 0
        },
        debts: [],
        verzekeringen: {
            zorgverzekering: {
                type: "resitutie",
                vrijwillig_risico: 0,
                collectief: false
            },
            overige: 38
        },
        data: [createYearData(18, 0, 0)],
        addPerson: function (gender, working, workhours, age) {
            this.people.push({
                gender: gender,
                working: working,
                workhours: workhours,
                age: age
            });
            return this;
        },
        addHouse: function (type, worth, oppervlak, rental, living) {
            this.bezittingen.houses.push({
                type: type,
                worth: worth,
                oppervlak: oppervlak,
                rental: rental,
                living: living
            });
            return this;
        },
        addCar: function (type, worth) {
            this.bezittingen.cars.push({
                type: type,
                worth: worth
            });
            return this;
        },
        addDebt: function (type, amount, interest, relief) {
            this.debts.push({
                type: type,
                amount: amount,
                interest: interest,
                relief: relief
            })
            return this;
        },
        setZorgverzekering: function (resitutie, eigenRisico, collectief) {
            this.verzekeringen.zorgverzekering = {
                type: `${resitutie ? "resitutie" : "natura"}`,
                vrijwillig_risico: eigenRisico,
                collectief: collectief
            }
            return this;
        },
        setOverigVerzekering: function (kosten) {
            this.verzekeringen.overige = kosten
            return this;
        },
        setRecreationBudget: function (min, max, min_percent, max_percent) {
            this.recreation.min = min;
            this.recreation.min_percent = min_percent;
            this.recreation.max = max;
            this.recreation.max_percent = max_percent;
            return this;
        },
        setBelegRisico: function (risk) {
            this.beleggingen.risico = risk;
            return this;
        },
        beleg: function (add, amount, type) {
            if (add) {
                this.beleggingen[type] += amount
            }
            else if (this.beleggingen[type] >= amount){
                this.beleggingen[type] -= amount
            }
            else {
                console.warn(`the amount that was tried to retrieve (${amount}) is more than what was available (${this.beleggingen[type]})`)
            }
            return this;
        }
    }
    return profile;
}


// returns new object to fill with that years data and to do calculations with
function createYearData(year, savings, pension) {
    let yearData = {
        year: year,
        total: 0,
        savings: savings,
        inkomsten: {
            total: 0,
            huisverhuur: 0
        },
        uitgaven: {
            total: 0,
            huiskosten: {
                total: 0,
                gas: 0,
                water: 0,
                elektriciteit: 0
            },
            verzekeringen: {
                total: 0
            },
            belastingen: {
                total: 0
            },
            debts: {
                total: 0
            },
            overige: {
                total: 0
            }
        },
        vermogen: {
            debts: 0,
            total: 0
        },
        pension: pension
    }
    return yearData;
}


// simulates buying a house
function buyHouse(profile, yearData, type, worth, oppervlak, percent_payed, relief) {
    if (percent_payed < 10) {
        console.warn(`Tried to pay only ${percent_payed}% of the house costs!`);
        return;
    }
    let payed = worth * percent_payed * 0.01;
    profile.addHouse(type, worth, oppervlak, false, false)
        .addDebt("huishypotheek", worth - payed, getNum(100, 200) / 100, relief);
    yearData.uitgaven.huiskosten.huisaankoop = payed;
    yearData.uitgaven.huiskosten.total += payed;
    return profile;
}


// returns average salary based on age group of all the people in an household
function calcSalaries(people) {
    let tot = 0;
    people.forEach(person => {
        if (person.working) {
            tot += dataUurlonen[`${person.age}`][`${person.gender}`] * person.workhours;
        }
        person.age += 1;
    });
    tot = tot * 1000;
    return tot;
}


// returns amount of € recieved per child each quarter year from the goverment
function calcKinderbijslag(people) {
    let tot = 0;
    let dataBijslag = dataInkomsten.kinderbijslag;
    people.forEach(p => {
        if (p.age < 6) {
            tot += +dataBijslag["tot5"];
        }
        else if (p.age < 12) {
            tot += +dataBijslag["tot11"];
        }
        else if (p.age < 18) {
            tot += +dataBijslag["tot17"];
        }
    });
    return tot;
}


// returns interest on savings
function calcSpaarrente(savings) {
    // the average interest on savings is 0.05%: https://blog.spaarrente.nl/gemiddelde-rente-spaarrekening#:~:text=Gemiddelde%20rente%20spaarrekening%20en%20deposito,-Door%20Redactie%20Spaarrente&text=Voor%20een%20vrij%20opneembare%20spaarrekening,jaars%20deposito%3A%200%2C38%25
    return savings < 0 ? 0 : savings * 0.0005;
}


// returns interest on invesments
function calcInvestmentInterest(investments) {
    const dataBelegging = dataInkomsten.belegging;
    const risk = investments.risico;
    const rngInterest = (dataObj) => {
        return getNum((dataObj.onder - risk) * 100, (dataObj.boven + risk) * 100) * 0.0001;
    } 
    investments[belegging.AANDEEL] += investments[belegging.AANDEEL] * rngInterest(dataBelegging.aandelen);
    investments[belegging.VASTGOED] += investments[belegging.VASTGOED] * rngInterest(dataBelegging.vastgoed);
    investments[belegging.STAAT] += investments[belegging.STAAT] * rngInterest(dataBelegging.obligaties.staat);
    investments[belegging.BEDRIJF] += investments[belegging.BEDRIJF] * rngInterest(dataBelegging.obligaties.bedrijf);
}


// returns the amount of money spent on recreative purposes
function calcRecreatieUitgaven(inkomsten, uitgaven, border) {
    let min = inkomsten * border.min_percent * 0.01;
    min = min < border.min ? border.min : min;
    let max = inkomsten * border.max_percent * 0.01;
    max = max < border.max ? border.max : max;
    let budget = inkomsten - uitgaven;
    budget = budget < 0 ? 0 : budget;
    if (min > budget) {
        return budget;
    }
    max = max > budget ? budget : max;
    return getNum(min, max);
}


// returns the costs for food per year
function calcVoedingskosten(people) {
    let tot = 0;
    let dataVoeding = dataUitgaven.voeding;
    people.forEach(p => {
        if (p.age < 4) {
            tot += dataVoeding.kosten.k_1_3;
        }
        else if (p.age < 9) {
            tot += dataVoeding.kosten.k_4_8;
        }
        else if (p.age < 14) {
            tot += dataVoeding.kosten.k_9_13;
        }
        else if (p.age < 51) {
            if (p.gender === "m") {
                tot += dataVoeding.kosten.m_14_50;
            }
            else {
                tot += dataVoeding.kosten.v_14_50;
            }
        }
        else if (p.age < 70) {
            if (p.gender === "m") {
                tot += dataVoeding.kosten.m_51_69;
            }
            else {
                tot += dataVoeding.kosten.v_51_69;
            }
        }
        else {
            tot += dataVoeding.kosten["mv_70+"];
        }
    });
    return tot * dataVoeding.factor[people.length > 4 ? 4 : people.length] * 365;
}


// returns rental costs of a house.
function calcHuur(huis) {
    if (huis.type === house.FLAT) {
        return huis.oppervlak * dataUitgaven.woninghuur.prijzen.appartementen;
    }
    else {
        return huis.oppervlak * dataUitgaven.woninghuur.prijzen.woonhuizen;
    }
}


function calcAutokosten(cars) {
    let tot = 0;
    let dataAuto = dataUitgaven.auto;
    cars.forEach(c => {
        let dataType = dataAuto[c.type];
        let afschrijving = c.worth < (dataType.vast.afschrijving + dataType.variabel.afschrijving) * 12 ? c.worth : (dataType.vast.afschrijving + dataType.variabel.afschrijving) * 12
        tot += dataType.totaal * 12 - afschrijving;
        c.worth = c.worth - afschrijving;
    });
    return tot;
}


// return gas upkeep costs
function calcGaskosten(huis) {
    let gas = dataUitgaven.gasverbruik
    switch (huis.type) {
        case house.FLAT:
            return gas.flat.kosten;
        case house.TUSSENWONING:
            return gas.tussenwoning.kosten;
        case house.HOEKWONING:
            return gas.hoekwoning.kosten;
        case house.TWEE_ONDER_EEN_KAP:
            return gas.twee_onder_een_kap.kosten;
        case house.VRIJSTAAND:
            return gas.vrijstaand.kosten;
        default:
            return 0;
    }
}


// return water upkeep costs
function calcWaterkosten(people) {
    let amount = people.length > 5 ? 5 : people.length;
    return dataUitgaven.waterverbruik[amount].kosten;
}


// return electricity upkeep costs
function calcElektriciteitskosten(people) {
    let amount = people.length > 5 ? 5 : people.length;
    return dataUitgaven.elektriciteitsverbruik[amount].kosten;
}


// return costs of medicare insurance
function calcZorgverzekering(verzekering, people) {
    let dataZorg = dataUitgaven.zorgverzekering;
    let er = dataZorg.vrijwillig_risico_korting[verzekering.vrijwillig_risico / 100]; // eigen risico korting
    er = 1 - er * 0.01
    let collectief = verzekering.collectief ? dataZorg.collectief : 0;
    collectief = 1 - collectief * 0.01
    if (verzekering.type === "resitutie") {
        return getNum(dataZorg.resitutie.onder, dataZorg.resitutie.boven) * people.length * er * collectief;
    }
    else {
        return getNum(dataZorg.natura.onder, dataZorg.natura.boven) * people.length * er * collectief;
    }
}


// returns total to be paid to inkomstenbelasting
function calcInkomstenbelasting(inkomsten) {
    let tot = 0;
    let schijven = dataUitgaven.belastingen.inkomensbelasting.schijven;
    let drempel = +schijven[1].drempel;
    if (inkomsten.total - drempel < 0) {
        tot = tot + inkomsten.total * schijven[0].belasting / 100;
    }
    else {
        tot = tot + drempel * schijven[0].belasting / 100;
        tot = tot + (inkomsten.total - drempel) * schijven[1].belasting / 100;
    }
    return tot;
}


// returns total to be paid to vermogensbelasing
function calcVermogensbelasting(spaargeld, bezittingen, married) {
    let vermogen = spaargeld;
    // TODO: bezittingen meerekenen & 2e huis meerekenen.
    let tot = 0;

    let schijven = dataUitgaven.belastingen.vermogensbelasting.schijven;
    const drempel1 = married ? schijven[0].drempel * 2 : schijven[0].drempel;
    const drempel2 = drempel1 + schijven[1].drempel;
    const drempel3 = drempel2 + schijven[2].drempel;

    if (vermogen > drempel3) {
        tot = tot + (vermogen - drempel3) * schijven[2].rendement;
        tot = tot + (vermogen - drempel2) * schijven[1].rendement;
        tot = tot + (vermogen - drempel1) * schijven[0].rendement;
    }
    else if (vermogen > drempel2) {
        tot = tot + (vermogen - drempel2) * schijven[1].rendement;
        tot = tot + (vermogen - drempel1) * schijven[0].rendement;
    }
    else if (vermogen > drempel1) {
        tot = tot + (vermogen - drempel1) * schijven[0].rendement;
    }
    tot = tot / 100;
    tot = tot * dataUitgaven.belastingen.vermogensbelasting.belasting / 100;
    return tot;
}


// returns total worth of all cars combined
function calcAutoVermogen(cars) {
    let tot = 0;
    cars.forEach(c => {
        tot += c.worth;
    });
    return tot;
}


// returns total worth of all houses owned combined, by default the house the person is living in is included in this calculation
function calcHuisVermogen(houses, includeLiving = true) {
    let tot = 0;
    houses.forEach(h => {
        // de prijsstijging van huizen is historisch gezien, gemiddeld genomen 4,85%: https://www.wegwijs.nl/verdieping/longreads/1-februari-huizenmarkt/
        let f = 1 + getNum(300, 670) * 0.0001;
        h.worth = h.worth * f;
        if (!h.living || (h.living && includeLiving && !h.rental)) {
            tot += h.worth;
        }
    });
    return tot;
}


// returns total worth of all investments combined
function calcInvestmentCapital(investments) {
    return investments[belegging.AANDEEL] + investments[belegging.VASTGOED] + investments[belegging.STAAT] + investments[belegging.BEDRIJF];
}


// returns total of debts
function calcDebts(yearData, debts) {
    let tot = 0;
    for (let i = 0; i < debts.length; i++) {
        let d = debts[i];
        if (d.amount < d.relief) {
            yearData.uitgaven.debts[d.type] = {
                total: d.amount,
                relief: d.amount,
                interest: 0
            };
            debts.splice(i, 1);
            i--;
        }
        else {
            d.amount -= d.relief;
            yearData.uitgaven.debts[d.type] = {
                total: d.relief + d.amount * d.interest * 0.01,
                relief: d.relief,
                interest: d.amount * d.interest * 0.01
            };
            yearData.vermogen.debts += d.amount;
        }
        yearData.uitgaven.debts.total += yearData.uitgaven.debts[d.type].total;
    }
}


// Source https://bl.ocks.org/mbostock/3916621, https://stackoverflow.com/questions/47363028/can-the-enter-selection-for-a-line-graph-be-animated
function pathTween(d1, precision, self) {
    return function () {
        let path0 = self,
            path1 = path0.cloneNode(),
            n0 = path0.getTotalLength(),
            n1 = (path1.setAttribute("d", d1), path1).getTotalLength();

        // Uniform sampling of distance based on specified precision.
        let distances = [0],
            i = 0,
            dt = precision / Math.max(n0, n1);
        while ((i += dt) < 1) distances.push(i);
        distances.push(1);

        // Compute point-interpolators at each distance.
        let points = distances.map(function (t) {
            let p0 = path0.getPointAtLength(t * n0),
                p1 = path1.getPointAtLength(t * n1);
            return d3.interpolate([p0.x, p0.y], [p1.x, p1.y]);
        });

        return function (t) {
            return t < 1 ? "M" + points.map(function (p) {
                return p(t);
            }).join("L") : d1;
        };
    };
}


// returns an array with numbers within the given boundaries
function getRandomData(size, minValue, maxValue) {
    let dataArray = [];
    for (let i = 0; i < size; i++) {
        dataArray.push(getNum(minValue, maxValue));
    }
    return dataArray;
}


// returns a random number between and including the min and max values
// used for generating random data for testing or random factors like share increases.
function getNum(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}