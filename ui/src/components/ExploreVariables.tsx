import InvestigationPanel, {
  type InvestigationPanelData,
} from "@/components/InvestigationPanel";

const investigations: InvestigationPanelData[] = [
  {
    id: "temperature-ozone",
    number: "01",
    title: "TEMPERATURE & OZONE",
    description:
      "Earth's atmosphere and surface reveal changing temperature patterns. Satellite observations help scientists study atmospheric temperatures and monitor ozone distribution across the planet.",
    kind: "temperature",
    dashboardUrl: "https://trend-detective-three.vercel.app/temperature-ozone.html",
    images: [
      {
        imageUrl: "/images/nasa/temperature-anomalies.jpg",
        alt: "NASA AIRS global atmospheric temperature anomaly map",
        title: "AIRS Temperature Anomalies",
        nasaId: "PIA24139",
        description:
          "NASA AIRS observations map atmospheric temperature anomalies in the troposphere and stratosphere.",
        credit: "NASA/JPL-Caltech",
        date: "January 4, 2022",
        sourceUrl: "https://images.nasa.gov/details/PIA24139",
      },
      {
        imageUrl: "/images/nasa/antarctic-ozone-hole-2009.jpg",
        alt: "NASA satellite map of the 2009 Antarctic ozone hole over the South Pole",
        title: "Antarctic Ozone Hole, 2009",
        nasaId: "GSFC_20171208_Archive_e002226",
        description:
          "NASA satellite observations map ozone concentrations over Antarctica as the 2009 ozone hole develops.",
        credit: "NASA Goddard Space Flight Center",
        date: "September 10, 2009",
        sourceUrl: "https://images.nasa.gov/details/GSFC_20171208_Archive_e002226",
      },
      {
        imageUrl: "/images/nasa/antarctic-ozone-hole-2010.jpg",
        alt: "NASA OMI satellite map of ozone concentrations over Antarctica in 2010",
        title: "Antarctic Ozone Hole, 2010",
        nasaId: "GSFC_20171208_Archive_e001962",
        description:
          "NASA Aura's Ozone Monitoring Instrument measured stratospheric ozone over Antarctica on September 12, 2010.",
        credit: "NASA Earth Observatory / Ozone Watch",
        date: "September 12, 2010",
        sourceUrl: "https://images.nasa.gov/details/GSFC_20171208_Archive_e001962",
      },
      {
        imageUrl: "/images/nasa/antarctic-ozone-hole-2014.jpg",
        alt: "NASA AIRS visualization of the Antarctic ozone hole forming over the South Pole in 2014",
        title: "Ozone Hole Formation over the South Pole",
        nasaId: "PIA20664",
        description:
          "NASA Aqua AIRS data visualize Antarctic ozone-hole formation and evolution from September to December 2014.",
        credit: "NASA/JPL-Caltech",
        date: "September - December 2014",
        sourceUrl: "https://images.nasa.gov/details/PIA20664",
      },
    ],
  },
  {
    id: "water-rainfall-vegetation",
    number: "02",
    title: "WATER, RAINFALL & VEGETATION",
    description:
      "Water availability, rainfall and vegetation are closely connected. NASA observations help scientists examine precipitation patterns, drought conditions and changes in vegetation across different ecosystems.",
    kind: "water",
    dashboardUrl: "https://trend-detective-three.vercel.app/water-vegetation.html",
    images: [
      {
        imageUrl: "/images/nasa/rainfall-wetlands.jpg",
        alt: "NASA Terra satellite view of the Kafue Flats wetland after seasonal rainfall",
        title: "Floodwaters Renew Zambia Kafue Wetland",
        nasaId: "PIA04371",
        description:
          "After seasonal rains, floodwaters support the diverse uses of water in Zambia's Kafue Flats wetland.",
        credit: "NASA/JPL",
        date: "November 10, 2004",
        sourceUrl: "https://images.nasa.gov/details/PIA04371",
      },
      {
        imageUrl: "/images/nasa/rainfall-imerg.jpg",
        alt: "NASA GPM IMERG global precipitation-rate visualization",
        title: "Near Real-Time Global Precipitation",
        nasaId: "GPM-IMERG-4285",
        description:
          "NASA's GPM IMERG combines satellite observations to map global rain and snowfall rates.",
        credit: "NASA GSFC Scientific Visualization Studio",
        date: "Updated November 15, 2026",
        sourceUrl: "https://svs.gsfc.nasa.gov/4285/",
      },
      {
        imageUrl: "/images/nasa/amazon-river-mouth.jpg",
        alt: "NASA Terra satellite image of the Amazon River flowing east across Brazil toward the Atlantic Ocean",
        title: "Mouth of the Amazon",
        nasaId: "PIA02643",
        description:
          "NASA Terra imagery follows the Amazon River east across Brazil to its mouth at the Atlantic Ocean.",
        credit: "NASA/JPL",
        date: "February 7, 2001",
        sourceUrl: "https://images.nasa.gov/details/PIA02643",
      },
      {
        imageUrl: "/images/nasa/amazon-manaus-rivers.jpg",
        alt: "NASA Terra satellite image of the Rio Negro and Solimoes rivers joining near Manaus, Brazil",
        title: "Where Two Rivers Become the Amazon",
        nasaId: "PIA02642",
        description:
          "Near Manaus, the pale Solimoes and dark Rio Negro converge to form the Amazon River.",
        credit: "NASA/JPL",
        date: "January 24, 2001",
        sourceUrl: "https://images.nasa.gov/details/PIA02642",
      },
      {
        imageUrl: "/images/nasa/amazon-vegetation.jpg",
        alt: "NASA Terra satellite imagery showing dense vegetation and cleared fields in Mato Grosso, Brazil",
        title: "Mato Grosso, Brazil",
        nasaId: "PIA11420",
        description:
          "NASA Terra imagery shows dense green vegetation giving way to cleared fields in Brazil's Amazon rainforest.",
        credit: "NASA/JPL",
        date: "October 16, 2008",
        sourceUrl: "https://images.nasa.gov/details/PIA11420",
      },
    ],
  },
  {
    id: "air-quality-pollution",
    number: "03",
    title: "AIR QUALITY & POLLUTION",
    description:
      "Satellite instruments help scientists observe aerosols and atmospheric gases, track pollution patterns and understand how air composition changes across regions.",
    kind: "air",
    dashboardUrl: "https://trend-detective-three.vercel.app/aqi-pollution.html",
    images: [
      {
        imageUrl: "/images/nasa/air-quality-delhi.jpg",
        alt: "NASA MISR satellite view of severe air pollution over New Delhi, India",
        title: "Severe Air Pollution in New Delhi",
        nasaId: "PIA21100",
        description:
          "NASA's MISR instrument observed a thick layer of haze over New Delhi during a period of severe air pollution.",
        credit: "NASA/JPL-Caltech",
        date: "November 2016",
        sourceUrl: "https://images.nasa.gov/details/PIA21100",
      },
      {
        imageUrl: "/images/nasa/eastern-china-haze.jpg",
        alt: "NASA Terra satellite image of dense pollution haze over northern China, including Beijing and Hebei",
        title: "Haze over Eastern China",
        nasaId: "GSFC_20171208_Archive_e001269",
        description:
          "NASA Terra MODIS captured thick haze over northern China on December 23, 2013, obscuring Beijing and Hebei.",
        credit: "NASA/GSFC/Jeff Schmaltz/MODIS Land Rapid Response Team",
        date: "December 23, 2013",
        sourceUrl: "https://images.nasa.gov/details/GSFC_20171208_Archive_e001269",
      },
      {
        imageUrl: "/images/nasa/northeastern-china-haze.jpg",
        alt: "NASA Aqua satellite image of haze and smog around Harbin in northeastern China",
        title: "Haze in Northeastern China",
        nasaId: "GSFC_20171208_Archive_e001358",
        description:
          "NASA Aqua MODIS observed pollution haze around Harbin, where air quality reached hazardous levels in October 2013.",
        credit: "NASA/GSFC/Jeff Schmaltz/MODIS Land Rapid Response Team",
        date: "October 21, 2013",
        sourceUrl: "https://images.nasa.gov/details/GSFC_20171208_Archive_e001358",
      },
    ],
  },
];

export default function ExploreVariables() {
  return (
    <section
      id="investigation"
      className="relative overflow-hidden bg-[#050a13] py-24 text-white md:py-32"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(34,211,238,0.07),transparent_42%)]" />
      <div
        className="absolute inset-0 opacity-[0.035]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
        }}
      />

      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <header className="mb-14 max-w-4xl md:mb-20">
          <p className="section-eyebrow">
            <span className="section-eyebrow-dot" />
            FIELD NOTES / EARTH SYSTEMS
          </p>
          <h2 className="mt-5 max-w-4xl text-3xl font-semibold uppercase leading-[0.98] tracking-[-0.045em] text-white sm:text-5xl lg:text-6xl">
            THE PLANET LEAVES CLUES.
            <br />
            <span className="text-cyan-200">WE INVESTIGATE.</span>
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg">
            Three interconnected perspectives. A deeper understanding of our changing planet.
          </p>
        </header>

        <div className="space-y-7 md:space-y-9">
          {investigations.map((investigation) => (
            <InvestigationPanel
              key={investigation.id}
              investigation={investigation}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
