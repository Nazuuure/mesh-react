function lotsAt(item, place) {
    const locations = item.lots ??= {};
    if (!locations[place]) {
        const quantity = item.stock[place] ?? 0;
        locations[place] = quantity ? [{ quantity, since: item.day ?? 0, storedDays: 0 }] : [];
    }
    return locations[place];
}

export function addStock(item, place, cargo, day, order, pickup = false) {
    const lots = lotsAt(item, place);
    for (const { quantity, storedDays } of cargo) {
        lots.push({ quantity, storedDays, since: pickup ? null : day, order });
        item.stock[place] = (item.stock[place] ?? 0) + quantity;
    }
}

export function takeStock(item, place, quantity, day, order) {
    const lots = lotsAt(item, place);
    const assigned = order == null ? [] : lots.filter(lot => lot.order === order);
    const available = assigned.length ? assigned : lots.filter(lot => lot.order == null);
    if (available.reduce((total, lot) => total + lot.quantity, 0) < quantity) {
        throw Error('Недостаточно товара в партиях пункта');
    }

    const cargo = [];
    let remaining = quantity;
    for (const lot of available) {
        if (!remaining) break;
        const taken = Math.min(remaining, lot.quantity);
        const dwell = lot.since == null ? 0 : Math.max(0, day - lot.since);
        cargo.push({ quantity: taken, storedDays: lot.storedDays + dwell });
        lot.quantity -= taken;
        remaining -= taken;
    }
    item.lots[place] = lots.filter(lot => lot.quantity > 0);
    item.stock[place] -= quantity;
    return cargo;
}

export function shippedCargo(item, request) {
    return request.cargo ?? [{
        quantity: request.qty,
        storedDays: Math.max(0, request.created - (item.day ?? request.created)),
    }];
}
