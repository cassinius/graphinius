import * as $G from '../core/BaseGraph';
declare class ClosenessCentrality {
    constructor();
    getCentralityMapFW(graph: $G.IGraph): Array<Number>;
    getCentralityMap(graph: $G.IGraph): {
        [id: string]: number;
    };
}
export { ClosenessCentrality };
