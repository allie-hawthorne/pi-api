import { differenceInHours, differenceInMinutes, subDays } from 'date-fns';
import { CanvasItem } from './entity/CanvasItem';
import { MoreThan } from 'typeorm';
import { getCanvasRepo, JWT_SECRET, UserToken } from '.';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { jwtDecode } from 'jwt-decode';

const HOURS_IN_DAY = 24;
const MINS_IN_HOUR = 60

export const getTimeToWait = (userItems: CanvasItem[]) => {
  const latest = userItems[userItems.length-1];

  const hoursToWait = HOURS_IN_DAY - Math.abs(differenceInHours(latest.updatedAt, new Date()))
  const minsToWait = (MINS_IN_HOUR * HOURS_IN_DAY) - Math.abs(differenceInMinutes(latest.updatedAt, new Date()))

  const timeToWait = hoursToWait <= 1
    ? `${minsToWait} minutes`
    : `${hoursToWait} hours`;

  return timeToWait;
}

export const getItemsInTheLastDay = async (userId: number, fingerprint: string) => {
    const inTheLastDay = MoreThan(subDays(new Date(), 1));
    return getCanvasRepo().findAndCount({where: [
        {updatedAt: inTheLastDay, userId},
        {updatedAt: inTheLastDay, fingerprint},
    ]});
}

export const getUserDataOrFail = (req: Request) => {
    const authToken = req.headers.authorization;
    const fingerprint = req.query.fingerprint?.toString();

    if (!authToken || !fingerprint) return;

    const userJwt = authToken.split(' ')[1];

    // Error will be thrown if authToken wasn't signed with our secret token
    console.log("TOKEN", authToken)
    jwt.verify(userJwt, JWT_SECRET);

    const { id } = jwtDecode<UserToken>(authToken);

    return { userId: id, fingerprint };
}
