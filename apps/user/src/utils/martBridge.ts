/**
 * Lets a chat (which lives outside the tab screens) send the owner to OnMart with a part already searched: the app registers how, the chat calls it.
 */
type Opener = (part: string) => void;

let opener: Opener | null = null;

export const setMartOpener = (fn: Opener | null) => {
  opener = fn;
};

export const openMartFor = (part: string) => opener?.(part);

/** The same for a parts shop tagged in a chat: OnMart opens on that shop. */
let shopOpener: ((shopId: string, ask?: boolean) => void) | null = null;

export const setShopOpener = (fn: ((shopId: string, ask?: boolean) => void) | null) => {
  shopOpener = fn;
};

/** `ask`: open the request form with this shop chosen, instead of its profile. */
export const openShopFor = (shopId: string, ask?: boolean) => shopOpener?.(shopId, ask);
