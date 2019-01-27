import { defer, throwError } from "rxjs";
import { finalize, tap, catchError } from "rxjs/operators";
import { serialize } from "./serializer";
const generateId = () => Math.random()
    .toString(36)
    .substr(2, 5);
const getSender = ({ groupId, marbleId }) => (type, body) => {
    postMessage({
        message: {
            type,
            body: Object.assign({}, (body ? serialize(body) : {}), { groupId,
                marbleId })
        },
        source: "rxjs-watcher"
    }, "*");
};
const operatorFactory = (sender, selector) => source => defer(() => {
    sender("SUBSCRIBE");
    return source.pipe(catchError(error => {
        sender("ERROR", { error });
        return throwError(error);
    }), tap(value => sender("NEXT", {
        value: typeof selector === "function" ? selector(value) : value
    })), finalize(() => sender("COMPLETE")));
});
/**
 * Create group in devtools panel and return pipeable operator to visualize rxjs marbles in specific group
 * @param groupName title for group
 * @param duration duration in seconds
 * @example
 * const watchInGroup = getGroup('Interval of even numbers', 20);
 * const interval$ = interval(1000).pipe(
 *     watchInGroup('source'),
 *     filter(value => value % 2 === 0),
 *     watchInGroup('filter odd numbers out')
 * )
 */
export function getGroup(groupName, duration = 10) {
    const groupId = generateId();
    getSender({ groupId })("GROUP_INIT", { groupName });
    return function (marbleName, selector) {
        const marbleId = generateId();
        const sendMessage = getSender({ groupId, marbleId });
        sendMessage("MARBLE_INIT", { marbleName, duration });
        return operatorFactory(sendMessage, selector);
    };
}
/**
 * Pipeable operator to visualize rxjs marble
 * @param marbleName title for marble
 * @param duration duration in seconds
 * @param selector selector function to change value shown in extension
 * @example
 * const interval$ = interval(1000).pipe(
 *   watch('source'),
 *   filter(value => value % 2 === 0),
 *   watch('filter odd numbers out')
 * )
 */
export function watch(marbleName, duration, selector) {
    const marbleId = generateId();
    const sendMessage = getSender({ marbleId });
    sendMessage("MARBLE_INIT", { marbleName, duration: duration });
    return operatorFactory(sendMessage, selector);
}
/**
 * Helper function to get array of watch operators with specified duration
 * @param durations sequence of durations in seconds
 * @example
 * const [watch10, watch20] = getWatchers(10, 20);
 * interval(1000).pipe(watch10('Inerval'))
 */
export const getWatchers = (...durations) => durations.map(duration => (name, selector) => watch(name, duration, selector));
