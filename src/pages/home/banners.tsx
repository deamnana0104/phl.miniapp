import Carousel from "@/components/carousel";
import { useAtomValue } from "jotai";
import { bannersState } from "@/state";
import { getFinalImageUrl } from "@/utils/format";

export default function Banners() {
  const banners = useAtomValue(bannersState);

  return (
    <Carousel
      slides={banners.map((banner) => (
        <img className="w-full rounded" src={getFinalImageUrl(banner)} />
      ))}
    />
  );
}
