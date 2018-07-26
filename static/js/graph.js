//Using queue() library.

queue()

//  defer method takes 2 arguments.  First is the format of the data that we want to load. Second is the path of the csv file.  
    .defer(d3.csv, "data/Salaries.csv")

//  The await method takes 1, which is the name of a function that we want to call when the data has been downloaded. We'll call the file makeGraphs. We could use any name we wanted. 
    
    .await(makeGraphs);
    
//  then we'll create the function makeGraphs. This takes two arguments the first is 'error' and the second is a variable 'salaryData' that the data from the CSV file will be passed into by queue.js     
    
    
//  When you've done that you can reload your app and if you switch to the developer tools you can actually put a breakpoint inside that makeGraph function switch into graph.js on line 7 I add a breakpoint and now when I reload the page my execution will stop on that break point and I can inspect the salaries data.
function makeGraphs(error, salaryData) {
    
//  To take a look at the data I'm going to use a crossfilter like we did in previous lessons so I create a variable ndx and I pass salary data to crossfilter. Once I have that created I create a dimension and a group and have a look at the data and so I pluck the rank data from the crossfilter. I then create a group grouping on that dimension (the rank dimension) and when I output group.all() to the console.  I can look and see that there are three different ranks and I can see the number of rows in each rank, so our data is loading correctly now we can move on and begin creating some graphs.

   var ndx = crossfilter(salaryData);
    
    salaryData.forEach(function(d){
        d.salary = parseInt(d.salary);
        d.yrs_since_phd = parseInt(d["yrs.since.phd"]);
        d.yrs_service = parseInt(d["yrs.service"]);
    })
    
    show_discipline_selector(ndx);
    
    show_percent_that_are_professors(ndx, "Female", "#percent-of-women-professors");
    show_percent_that_are_professors(ndx, "Male", "#percent-of-men-professors");
    
    show_gender_balance(ndx);
    show_average_salary(ndx);
    show_rank_distribution(ndx);
    
    show_service_to_salary_correlation(ndx);
    show_phd_to_salary_correlation(ndx);
    
    dc.renderAll();
}


function show_discipline_selector(ndx) {
    var dim = ndx.dimension(dc.pluck('discipline'));
    var group = dim.group();
    
    dc.selectMenu("#discipline-selector")
        .dimension(dim)
        .group(group);
}


function show_percent_that_are_professors(ndx, gender, element) {
    var percentageThatAreProf = ndx.groupAll().reduce(
        function(p, v) {
            if (v.sex === gender) {
                p.count++;
                if(v.rank === "Prof") {
                    p.are_prof++;
                }
            }
            return p;
        },
        function(p, v) {
            if (v.sex === gender) {
                p.count--;
                if(v.rank === "Prof") {
                    p.are_prof--;
                }
            }
            return p;
        },
        function() {
            return {count: 0, are_prof: 0};    
        },
    );
    
    dc.numberDisplay(element)
        .formatNumber(d3.format(".2%"))
        .valueAccessor(function (d) {
            if (d.count == 0) {
                return 0;
            } else {
                return (d.are_prof / d.count);
            }
        })
        .group(percentageThatAreProf)
}

//  Then we'll create a div where our first chart can be drawn, and we'll give it an ID and this will be important in a few minutes so our ID for this div is gender - balance. For each chart we'll create a different div with a specific ID. 

//  We have a few little housekeeping things to do before we get started on this specific graph we need to create a crossfilter and we have one of these for the whole dashboard. So we load our salaryData into our crossfilter just like we did in the console in the last video. We pass the ndx variable the crossfilter to the function that's going to draw a graph and we can call this function anything we want so I'm going to call it show_gender_balance and I pass it ndx and of course show_gender_balance doesn't exist yet we're about to create it so we write this function it takes one argument ndx and inside this function now we can focus on specifically one graph so each graph is going to have its own function and we're going to follow the same pattern for every graph we draw.

//  Create a div, create a function and have the graph rendered in the div. Inside the function we can use the ndx variable the crossfilter to create our dimension and in this case we'll pluck the sex column which indicates male or female and we'll also create a group and we're just going to count the rows in the data that have each of the two genders so we don't have to do any reduces here. Now we use the dimensional charting barChart and here's where that div ID comes into play we use a CSS selector so hash gender - balance to indicate that this barChart should be rendered in that div. We set the width and the height of the chart and we can also specify margins for the top, left, bottom and right. We specified the dimension of the chart and of course we also specify the group transitionDuration will indicate how quickly the chart animates when we filter and the x-axis will use an ordinal scale and the reason for that is that the dimension consists of the words male and female and then the y axis will be the count of how many of each of those there were so we need d3 scale ordinal and for the units we need DC units ordinal. We'll set elastic Y now we'll remove this a little bit later but let's add it now and see the impact it has and we'll also specify an x-axis label in this case gender and we'll specify the number of ticks that should appear on the y-axis and that's it. Our bar chart is ready to go but to get it to render we need to call the renderAll function for dimensional charting. With that done we can switch to our dashboard and hit refresh and hopefully we'll see our dashboard and there it is and as you can see there are three hundred and fifty eight rows in our data set that are male and thirty nine that are female that's our first chart and we'll follow the same pattern for all the remaining charts in the dashboard.

function show_gender_balance(ndx) {
    var dim = ndx.dimension(dc.pluck('sex'));
    var group = dim.group();
    
    dc.barChart("#gender-balance")
        .width(400)
        .height(300)
        .margins({top: 10, right: 50, bottom: 30, left: 50})
        .dimension(dim)
        .group(group)
        .transitionDuration(500)
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .xAxisLabel("Gender")
        .yAxis().ticks(20);
}


function show_average_salary(ndx) {
    var dim = ndx.dimension(dc.pluck('sex'));
    
    function add_item(p, v) {
        p.count++;
        p.total += v.salary;
        p.average = p.total / p.count;
        return p;
    }

    function remove_item(p, v) {
        p.count--;
        if(p.count == 0) {
            p.total = 0;
            p.average = 0;
        } else {
            p.total -= v.salary;
            p.average = p.total / p.count;
        }
        return p;
    }
    
    function initialise() {
        return {count: 0, total: 0, average: 0};
    }

    var averageSalaryByGender = dim.group().reduce(add_item, remove_item, initialise);

    dc.barChart("#average-salary")
        .width(400)
        .height(300)
        .margins({top: 10, right: 50, bottom: 30, left: 50})
        .dimension(dim)
        .group(averageSalaryByGender)
        .valueAccessor(function(d){
            return d.value.average.toFixed(2);
        })
        .transitionDuration(500)
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .elasticY(true)
        .xAxisLabel("Gender")
        .yAxis().ticks(4);
}


function show_rank_distribution(ndx) {
    
    function rankByGender(dimension, rank) {
        return dimension.group().reduce(
            function (p, v) {
                p.total++;
                if(v.rank == rank) {
                    p.match++;
                }
                return p;
            },
            function (p, v) {
                p.total--;
                if(v.rank == rank) {
                    p.match--;
                }
                return p;
            },
            function () {
                return {total: 0, match: 0};
            }
        );
    }
    
    var dim = ndx.dimension(dc.pluck("sex"));
    var profByGender = rankByGender(dim, "Prof");
    var asstProfByGender = rankByGender(dim, "AsstProf");
    var assocProfByGender = rankByGender(dim, "AssocProf");
    
    dc.barChart("#rank-distribution")
        .width(400)
        .height(300)
        .dimension(dim)
        .group(profByGender, "Prof")
        .stack(asstProfByGender, "Asst Prof")
        .stack(assocProfByGender, "Assoc Prof")
        .valueAccessor(function(d) {
            if(d.value.total > 0) {
                return (d.value.match / d.value.total) * 100;
            } else {
                return 0;
            }
        })
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .legend(dc.legend().x(320).y(20).itemHeight(15).gap(5))
        .margins({top: 10, right: 100, bottom: 30, left: 30});
}


function show_service_to_salary_correlation(ndx) {
    
    var genderColors = d3.scale.ordinal()
        .domain(["Female", "Male"])
        .range(["pink", "blue"]);
    
    var eDim = ndx.dimension(dc.pluck("yrs_service"));
    var experienceDim = ndx.dimension(function(d) {
       return [d.yrs_service, d.salary, d.rank, d.sex];
    });
    var experienceSalaryGroup = experienceDim.group();
    
    var minExperience = eDim.bottom(1)[0].yrs_service;
    var maxExperience = eDim.top(1)[0].yrs_service;
    
    dc.scatterPlot("#service-salary")
        .width(800)
        .height(400)
        .x(d3.scale.linear().domain([minExperience, maxExperience]))
        .brushOn(false)
        .symbolSize(8)
        .clipPadding(10)
        .xAxisLabel("Years Of Service")
        .title(function(d) {
            return d.key[2] + " earned " + d.key[1];
        })
        .colorAccessor(function (d) {
            return d.key[3];
        })
        .colors(genderColors)
        .dimension(experienceDim)
        .group(experienceSalaryGroup)
        .margins({top: 10, right: 50, bottom: 75, left: 75});
}



function show_phd_to_salary_correlation(ndx) {
    
    var genderColors = d3.scale.ordinal()
        .domain(["Female", "Male"])
        .range(["pink", "blue"]);
    
    var pDim = ndx.dimension(dc.pluck("yrs_since_phd"));
    var phdDim = ndx.dimension(function(d) {
       return [d.yrs_since_phd, d.salary, d.rank, d.sex];
    });
    var phdSalaryGroup = phdDim.group();
    
    var minPhd = pDim.bottom(1)[0].yrs_since_phd;
    var maxPhd = pDim.top(1)[0].yrs_since_phd;
    
    dc.scatterPlot("#phd-salary")
        .width(800)
        .height(400)
        .x(d3.scale.linear().domain([minPhd, maxPhd]))
        .brushOn(false)
        .symbolSize(8)
        .clipPadding(10)
        .xAxisLabel("Years Since PhD")
        .title(function(d) {
            return d.key[2] + " earned " + d.key[1];
        })
        .colorAccessor(function (d) {
            return d.key[3];
        })
        .colors(genderColors)
        .dimension(phdDim)
        .group(phdSalaryGroup)
        .margins({top: 10, right: 50, bottom: 75, left: 75});
}
