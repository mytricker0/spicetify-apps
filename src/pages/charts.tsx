import React from "react";
import Status from "../components/status";
import useDropdownMenu from "../components/hooks/useDropdownMenu";
import { apiRequest, checkLiked, convertToSpotify, updatePageCache } from "../funcs";
import ArtistCard from "../components/cards/artist_card";
import TrackRow from "../components/track_row";
import Tracklist from "../components/tracklist";
import PageHeader from "../components/page_header";

const ChartsPage = ({ config }: any) => {
    const [chartData, setChartData] = React.useState<Record<string, any>[] | 100 | 200 | 500>(100);
    const [dropdown, activeOption, setActiveOption] = useDropdownMenu(["artists", "tracks"], ["Top Artists", "Top Tracks"], "charts");

    async function fetchChartData(type: string, force?: boolean, set: boolean = true) {
        if (!force) {
            let storedData = Spicetify.LocalStorage.get(`stats:charts:${type}`);
            if (storedData) {
                setChartData(JSON.parse(storedData));
                return;
            }
        }

        const api_key = config.CONFIG["api-key"];
        if (!api_key) {
            setChartData(200);
            return;
        }

        const response = await apiRequest("charts", `http://ws.audioscrobbler.com/2.0/?method=chart.gettop${type}&api_key=${api_key}&format=json`);
        if (!response) {
            setChartData(500);
            return;
        }
        const data = response[type].track || response[type].artist;
        const cardData = await convertToSpotify(data, type);

        if (type === "tracks") {
            const fetchedLikedArray = await checkLiked(cardData.map(track => track.id));
            if (!fetchedLikedArray) {
                setChartData(200);
                return;
            }
            cardData.forEach((track: any, index: number) => {
                track.liked = fetchedLikedArray[index];
            });
        }

        if (set) setChartData(cardData);

        Spicetify.LocalStorage.set(`stats:charts:${type}`, JSON.stringify(cardData));
    }

    React.useEffect(() => {
        updatePageCache(4, fetchChartData, activeOption, "charts");
    }, []);

    React.useEffect(() => {
        fetchChartData(activeOption);
    }, [activeOption]);

    const props = {
        callback: () => fetchChartData(activeOption, true),
        config: config,
        dropdown: dropdown,
    };

    switch (chartData) {
        case 200:
            return (
                <PageHeader title={`Charts -  Top ${activeOption.charAt(0).toUpperCase()}${activeOption.slice(1)}`} {...props}>
                    <Status icon="error" heading="No API Key" subheading="Please enter your Last.fm API key in the settings menu." />
                </PageHeader>
            );
        case 500:
            return (
                <PageHeader title={`Charts -  Top ${activeOption.charAt(0).toUpperCase()}${activeOption.slice(1)}`} {...props}>
                    <Status icon="error" heading="Error" subheading="An error occurred while fetching the data." />
                </PageHeader>
            );
        case 100:
            return (
                <PageHeader title={`Charts -  Top ${activeOption.charAt(0).toUpperCase()}${activeOption.slice(1)}`} {...props}>
                    <Status icon="library" heading="Loading" subheading="Fetching data from Last.fm..." />
                </PageHeader>
            );
    }

    if (activeOption === "artists") {
        const artistCards = chartData.map((artist, index) => (
            <ArtistCard key={artist.id} name={artist.name} image={artist.image} uri={artist.uri} subtext={`#${index + 1} Artist`} />
        ));
        return (
            <PageHeader title="Charts - Top Artists" {...props}>
                <div className={`main-gridContainer-gridContainer stats-grid`}>{artistCards}</div>
            </PageHeader>
        );
    } else {
        if (!chartData[0]?.album) setChartData(100);
        const trackRows = chartData.map((track: any, index) => <TrackRow index={index + 1} {...track} />);
        return (
            <PageHeader title="Charts - Top Tracks" {...props}>
                <Tracklist>{trackRows}</Tracklist>
            </PageHeader>
        );
    }
};

export default ChartsPage;