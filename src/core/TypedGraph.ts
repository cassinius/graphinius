import { IBaseNode } from './BaseNode';
import { IBaseEdge } from './BaseEdge';
import { BaseGraph, GraphMode, GraphStats } from './BaseGraph';

export const GENERIC_TYPE = "GENERIC";

export type TypedNodes = Map<string, Map<string, IBaseNode>>;
export type TypedEdges = Map<string, Map<string, IBaseEdge>>;

export interface TypedGraphStats extends GraphStats {
	node_types: string[];
	edge_types: string[];
	typed_nodes: {[key: string]: number};
	typed_edges: {[key: string]: number};
}


/**
 * @description in the typedGraph setting, we use the label as type
 * @todo introduce extra type property
 * @description coding standard: following Neo4j / Cypher standard,
 * node types should be in capital letters & edge types expressive
 * two-pieces separated by underscore (except 'GENERIC')
 * @todo enforce uppercase?
 * @description we could couple edge type & direction in order to
 * make the system more stringent, but this would result in a more
 * complex setup with the possibility of too many Errors thrown.
 * @solution for now, leave the type / direction combination to the
 * programmer & just assume internal consistency
 * @todo how to handle traversal when direction given goes against
 * 			 direction information in the edge object ?
 * @todo just don't specify direction in traversal / expand and only
 * 			 follow the direction specified in edge !?
 * @todo in the last case, how to handle undirected edges ?
 * @todo allow 'GENERIC' edge types ?
 */
export class TypedGraph extends BaseGraph {

	/**
	 * We don't need an extra array of registered types, since an
	 * acceptable recommendation graph will only contain a few single
	 * up to a few dozen different types, which are quickly obtained
	 * via Object.keys()
	 */
	protected _typedNodes : TypedNodes = new Map();
	protected _typedEdges : TypedEdges = new Map();


	constructor(public _label) {
		super(_label);
		this._typedNodes.set(GENERIC_TYPE, new Map());
		this._typedEdges.set(GENERIC_TYPE, new Map());
	}


	nodeTypes() : string[] {
		return Array.from(this._typedNodes.keys());
	}


	edgeTypes() : string[] {
		return Array.from(this._typedEdges.keys());
	}


	nrTypedNodes(type: string) : number | null {
		type = type.toUpperCase();
		return this._typedNodes.get(type) ? this._typedNodes.get(type).size : null;
	}


	nrTypedEdges(type: string) : number | null {
		type = type.toUpperCase();
		return this._typedEdges.get(type) ? this._typedEdges.get(type).size : null;
	}


	addNode(node: IBaseNode) : boolean {
		if ( !super.addNode(node) ) {
			return false;
		}

		const id = node.getID(),
					label = node.getLabel().toUpperCase();

		/**
		 *  Untyped nodes will be treated as `generic` type
		 *
		 *  @todo make sure node IDs don't match labels
		 *  			if you don't want that behavior
		 */
		if ( id === label ) {
			this._typedNodes.get(GENERIC_TYPE).set(id, node);
		}
		else {
			if ( !this._typedNodes.get(label) ) {
				this._typedNodes.set(label, new Map());
			}
			this._typedNodes.get(label).set(id, node);
		}
		return true;
	}


	deleteNode(node: IBaseNode): void {
		const id = node.getID(),
					label = node.getLabel() === id ? GENERIC_TYPE : node.getLabel().toUpperCase();

		if ( !this._typedNodes.get(label) ) {
			throw Error('Node type does not exist on this TypedGraph.');
		}
		const removeNode = this._typedNodes.get(label).get(id);
		if ( !removeNode ) {
			throw Error('This particular node is nowhere to be found in its typed set.')
		}
		this._typedNodes.get(label).delete(id);
		if ( this.nrTypedNodes(label) === 0 ) {
			this._typedNodes.delete(label);
		}

		super.deleteNode(node);
	}


	addEdge(edge: IBaseEdge) : boolean {
		if ( !super.addEdge(edge) ) {
			return false;
		}

		const id = edge.getID(),
			label = edge.getLabel().toUpperCase();

		/**
		 *  Same procedure as every node...
		 */
		if ( id === label ) {
			this._typedEdges.get(GENERIC_TYPE).set(id, edge);
		}
		else {
			if ( !this._typedEdges.get(label) ) {
				this._typedEdges.set(label, new Map());
			}
			this._typedEdges.get(label).set(id, edge);
		}
		return true;
	}


	deleteEdge(edge: IBaseEdge): void {
		const id = edge.getID(),
			label = edge.getLabel() === id ? GENERIC_TYPE : edge.getLabel().toUpperCase();

		if ( !this._typedEdges.get(label) ) {
			throw Error('Edge type does not exist on this TypedGraph.');
		}
		const removeEdge = this._typedEdges.get(label).get(id);
		if ( !removeEdge ) {
			throw Error('This particular edge is nowhere to be found in its typed set.')
		}
		this._typedEdges.get(label).delete(id);
		if ( this.nrTypedEdges(label) === 0 ) {
			this._typedEdges.delete(label);
		}

		super.deleteEdge(edge);
	}


	getStats(): TypedGraphStats {
		let typed_nodes = {},
				typed_edges = {};
		this._typedNodes.forEach((k, v) => typed_nodes[v] = k.size);
		this._typedEdges.forEach((k, v) => typed_edges[v] = k.size);
		return {
			...super.getStats(),
			node_types: this.nodeTypes(),
			edge_types: this.edgeTypes(),
			typed_nodes,
			typed_edges
		};
	}

}
