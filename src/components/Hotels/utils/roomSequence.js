export function getChildrenCount(value) {
    return Array.isArray(value) ? value.length : Number(value ?? 0);
}

export function getRateSeqNo(rate, room) {
    const seq = rate?.metadata?.seq_no ?? rate?.seq_no ?? room?.metadata?.seq_no;
    if (seq === null || seq === undefined || seq === '') return null;
    const parsed = Number(seq);
    return Number.isNaN(parsed) ? null : parsed;
}

export function getSelectedSeqNo(selected) {
    const seq = selected?.seqNo ?? selected?.searchRoomIndex;
    if (seq === null || seq === undefined || seq === '') return null;
    const parsed = Number(seq);
    return Number.isNaN(parsed) ? null : parsed;
}

export function sortSelectedRoomsBySeq(selectedRooms = []) {
    return [...selectedRooms].sort((a, b) => {
        const seqA = getSelectedSeqNo(a);
        const seqB = getSelectedSeqNo(b);
        if (seqA === null && seqB === null) return 0;
        if (seqA === null) return 1;
        if (seqB === null) return -1;
        return seqA - seqB;
    });
}

export function flattenRoomRates(rooms = []) {
    const entries = [];
    rooms.forEach((room, roomIndex) => {
        (room?.rates || []).forEach((rate, rateIndex) => {
            entries.push({ room, rate, roomIndex, rateIndex });
        });
    });
    return entries;
}

export function sortRoomRateEntries(entries = []) {
    return [...entries].sort((a, b) => {
        const seqA = getRateSeqNo(a.rate, a.room);
        const seqB = getRateSeqNo(b.rate, b.room);
        if (seqA !== null && seqB !== null && seqA !== seqB) return seqA - seqB;
        if (seqA !== null && seqB === null) return -1;
        if (seqA === null && seqB !== null) return 1;
        return a.roomIndex - b.roomIndex || a.rateIndex - b.rateIndex;
    });
}

function findMatchingSelectedIndex(rate, selectedQueue, used) {
    const existingSeq = getRateSeqNo(rate);
    if (existingSeq !== null) {
        const seqIdx = selectedQueue.findIndex((sel, i) =>
            !used.has(i) && getSelectedSeqNo(sel) === existingSeq
        );
        if (seqIdx !== -1) return seqIdx;
    }

    const rateKeyIdx = selectedQueue.findIndex((sel, i) =>
        !used.has(i) && sel?.ratekey && sel.ratekey === rate?.rate_key
    );
    if (rateKeyIdx !== -1) return rateKeyIdx;

    return selectedQueue.findIndex((sel, i) =>
        !used.has(i) &&
        Number(rate?.adults ?? 0) === Number(sel?.adults ?? 0) &&
        Number(rate?.children ?? 0) === getChildrenCount(sel?.children)
    );
}

export function stampAndSortRooms(apiRooms = [], selectedRooms = []) {
    const selectedQueue = sortSelectedRoomsBySeq(selectedRooms).flatMap((sel) =>
        Array.from({ length: Math.max(1, Number(sel?.qty || 1)) }, () => sel)
    );
    const used = new Set();

    const stamped = (apiRooms || []).map((room) => ({
        ...room,
        rates: (room?.rates || []).map((rate) => {
            const matchIdx = findMatchingSelectedIndex(rate, selectedQueue, used);
            const existingSeq = getRateSeqNo(rate, room);
            if (matchIdx === -1) {
                return existingSeq === null ? rate : {
                    ...rate,
                    metadata: { ...(rate.metadata || {}), seq_no: existingSeq },
                };
            }

            used.add(matchIdx);
            const seqNo = existingSeq ?? getSelectedSeqNo(selectedQueue[matchIdx]);
            if (seqNo === null) return rate;
            return {
                ...rate,
                metadata: {
                    ...(rate.metadata || {}),
                    seq_no: seqNo,
                },
            };
        }),
    }));

    return stamped
        .map((room) => ({
            ...room,
            rates: [...(room.rates || [])].sort((a, b) => {
                const seqA = getRateSeqNo(a, room);
                const seqB = getRateSeqNo(b, room);
                if (seqA !== null && seqB !== null && seqA !== seqB) return seqA - seqB;
                if (seqA !== null && seqB === null) return -1;
                if (seqA === null && seqB !== null) return 1;
                return 0;
            }),
        }))
        .sort((a, b) => {
            const seqA = getRateSeqNo(a.rates?.[0], a);
            const seqB = getRateSeqNo(b.rates?.[0], b);
            if (seqA !== null && seqB !== null && seqA !== seqB) return seqA - seqB;
            if (seqA !== null && seqB === null) return -1;
            if (seqA === null && seqB !== null) return 1;
            return 0;
        });
}
