import * as $E from './BaseEdge';
import {TypedNode} from '../typed/TypedNode';
import * as $SU from '../../utils/StructUtils';


export interface NeighborEntry {
  node  : IBaseNode;
  edge  : $E.IBaseEdge;
  // only used (and tested) in PFS
  best? : number;
}

export interface BaseNodeConfig {
	label?			: string;
	features?		: {[key: string]: any};
}

type NodeFeatures = { [k:string]: any };


export interface IBaseNode {
	/**
	 * Getters
	 */
	readonly id: string;
	readonly label: string;
	readonly features: NodeFeatures;

	getID()	: string;
	getLabel() : string;
	setLabel(label : string) : void;
	
	// FEATURES methods
	getFeatures() : NodeFeatures;
	getFeature(key: string) : any;
	f(key:string) : any | undefined; // shortcut for getFeature
	setFeatures( features: NodeFeatures ) : void;
	setFeature(key: string, value: any) : void;
	deleteFeature(key: string) : any;
	clearFeatures() : void;
	
	// Degrees
	inDegree() : number;
	outDegree() : number;
	degree() : number;
	selfDegree() : number;

	
	// EDGE methods
	addEdge(edge: $E.IBaseEdge) : $E.IBaseEdge;
	hasEdge(edge: $E.IBaseEdge) : boolean;	
	hasEdgeID(id: string) : boolean;	
	getEdge(id: string) : $E.IBaseEdge;
	
	inEdges() : {[k: string] : $E.IBaseEdge};
	outEdges() : {[k: string] : $E.IBaseEdge};
	undEdges() : {[k: string] : $E.IBaseEdge};
	dirEdges() : {[k: string] : $E.IBaseEdge};
	allEdges() : {[k: string] : $E.IBaseEdge};

	removeEdge(edge: $E.IBaseEdge) : void;
	removeEdgeByID(id: string) : void;
	
	// Clear different types of edges
	clearOutEdges() : void;
	clearInEdges() : void;
	clearUndEdges() : void;
	clearEdges() : void;
	
	// neighborhood methods
	prevNodes() : Array<NeighborEntry>;
	nextNodes() : Array<NeighborEntry>;
	connNodes() : Array<NeighborEntry>;
	reachNodes(identityFunc?: Function) : Array<NeighborEntry>;
	allNeighbors(identityFunc?: Function) : Array<NeighborEntry>;

	clone() : IBaseNode;
}


class BaseNode implements IBaseNode {
	protected _label : string;
	protected _in_degree = 0;
	protected _out_degree = 0;
	protected _und_degree = 0;
	protected _self_degree = 0;
	protected _features	: NodeFeatures;
		
	protected _in_edges		: {[k: string] : $E.IBaseEdge};
	protected _out_edges	: {[k: string] : $E.IBaseEdge};
	protected _und_edges	: {[k: string] : $E.IBaseEdge};

	/**
	 * @param _id
	 * @param config
	 */
	constructor (
								protected _id: string,
								config: BaseNodeConfig = {}
							)
	{
		this._in_edges = {};
		this._out_edges = {};
		this._und_edges = {};
		this._label = config.label || _id;
		this._features = config.features != null ? $SU.clone(config.features) : {};
	}

	static isTyped(arg: any): arg is TypedNode {
		return !!arg.type;
	}

	get id(): string {
		return this._id;
	}

	get label(): string {
		return this._label;
	}

	get features(): NodeFeatures {
		return this._features;
	}
	
	getID()	: string {
		return this._id;
	}
	
	getLabel() : string {
		return this._label;
	}

	setLabel(label : string) : void {
		this._label = label;
	}
		
	getFeatures() : { [k:string] : any } {
		return this._features;
	}
	
	getFeature(key: string) : any | undefined {
		return this._features[key];
	}

	f(key:string) : any | undefined {
		return this.getFeature(key);
	}
	
	setFeatures( features: { [k:string]: any } ) : void {
		this._features = $SU.clone(features);
	}
	
	setFeature(key: string, value: any) : void {
		this._features[key] = value;
	}
	
	deleteFeature(key: string) : any {
		let feat = this._features[key];
		delete this._features[key];
		return feat;
	}
	
	clearFeatures() : void {
		this._features = {};
	}
				
	inDegree() : number {
		return this._in_degree;
	}
	
	outDegree() : number {
		return this._out_degree;
	}
	
	degree() : number {
		return this._und_degree;
	}

	selfDegree(): number {
		return this._self_degree;
	}

	/**
	 * We have to: 
	 * 1. throw an error if the edge is already attached
	 * 2. add it to the edge array
	 * 3. check type of edge (directed / undirected)
	 * 4. update our degrees accordingly
	 * This is a design decision we can defend by pointing out
	 * that querying degrees will occur much more often
	 * than modifying the edge structure of a node (??)
	 * One further point: do we also check for duplicate
	 * edges not in the sense of duplicate ID's but duplicate
	 * structure (nodes, direction) ?
	 * => Not for now, as we would have to check every edge
	 * instead of simply checking the hash id...
	 * ALTHOUGH: adding edges will (presumably) not occur often...
	 */
	addEdge(edge: $E.IBaseEdge) : $E.IBaseEdge {
		// is this edge connected to us at all?
		let nodes = edge.getNodes();
		if ( nodes.a !== this && nodes.b !== this ) {
			throw new Error("Cannot add edge that does not connect to this node");
		}
		let edgeID = edge.getID();
		
		// Is it an undirected or directed edge?
		if ( edge.isDirected() ) {
			// is it outgoing or incoming?
			if ( nodes.a === this && !this._out_edges[edgeID]) {
				this._out_edges[edgeID] = edge;
				this._out_degree += 1;
				// Is the edge also connecting to ourselves -> SELF_LOOP ?
				if ( nodes.b === this && !this._in_edges[edgeID]) {
					this._in_edges[edgeID] = edge;
					this._in_degree += 1;
				}
			}
			// Can't be a SELF_LOOP anymore
			else if ( !this._in_edges[edgeID] ) { // nodes.b === this
				this._in_edges[edgeID] = edge;
				this._in_degree += 1;
			}
		}
		// UNdirected
		else {
			// Is the edge also connecting to ourselves -> SELF_LOOP
			if (this._und_edges[ edge.getID() ]) {
				throw new Error("Cannot add same undirected edge multiple times.");
			}
			this._und_edges[edge.getID()] = edge;
			this._und_degree += 1;
		}
		return edge;
	}
	
	hasEdge(edge: $E.IBaseEdge) : boolean {
		return !!this._in_edges[ edge.getID() ] || !!this._out_edges[ edge.getID() ] || !!this._und_edges[ edge.getID() ];
	}
	
	hasEdgeID(id: string) : boolean {
		return !!this._in_edges[ id ] || !!this._out_edges[ id ] || !!this._und_edges[ id ];
	}
	
	getEdge(id: string) : $E.IBaseEdge {
		let edge = this._in_edges[id] || this._out_edges[id] || this._und_edges[id];
		if ( !edge ) {
			throw new Error("Cannot retrieve non-existing edge.");
		}
		return edge;
	}
	
	inEdges() : {[k: string] : $E.IBaseEdge} {
		return this._in_edges;
	}
	
	outEdges() : {[k: string] : $E.IBaseEdge} {
		return this._out_edges;
	}
	
	undEdges() : {[k: string] : $E.IBaseEdge} {
		return this._und_edges;
	}

	dirEdges() : {[k: string] : $E.IBaseEdge} {
		return $SU.mergeObjects([this._in_edges, this._out_edges]);
	}

	allEdges() : {[k: string] : $E.IBaseEdge} {
		return $SU.mergeObjects([this._in_edges, this._out_edges, this._und_edges]);
	}
	
	removeEdge(edge: $E.IBaseEdge) : void {
		if ( !this.hasEdge(edge) ) {
			throw new Error("Cannot remove unconnected edge.");
		}
		let id = edge.getID();
		let e = this._und_edges[id];
		if ( e ) {
			delete this._und_edges[id];
			this._und_degree -= 1;
		}
		e = this._in_edges[id];
		if ( e ) {
			delete this._in_edges[id];
			this._in_degree -= 1;
		}
		e = this._out_edges[id];
		if ( e ) {
			delete this._out_edges[id];
			this._out_degree -= 1;
		}
	}

	removeEdgeByID(id: string) : void {
		if ( !this.hasEdgeID(id) ) {
			throw new Error("Cannot remove unconnected edge.");
		}
		let e = this._und_edges[id];
		if ( e ) { 
			delete this._und_edges[id];
			this._und_degree -= 1;
		}
		e = this._in_edges[id];
		if ( e ) { 
			delete this._in_edges[id];
			this._in_degree -= 1;
		}
		e = this._out_edges[id];
		if ( e ) { 
			delete this._out_edges[id];
			this._out_degree -= 1;
		}
	}
	
	clearOutEdges() : void {
		this._out_edges = {};
		this._out_degree = 0;
	}
	
	clearInEdges() : void {
		this._in_edges = {};		
		this._in_degree = 0;
	}
	
	clearUndEdges() : void {
		this._und_edges = {};
		this._und_degree = 0;
	}
	
	clearEdges() : void {
		this.clearInEdges();
		this.clearOutEdges();
		this.clearUndEdges();
	}
	
	/**
	 * return the set of all nodes that have
	 * directed edges coming into this node
	 */
	prevNodes() : Array<NeighborEntry> {
		let prevs : Array<NeighborEntry> = [];
		let key 	: string,
				edge 	: $E.IBaseEdge;
				
		for ( key in this._in_edges ) {
			if ( this._in_edges.hasOwnProperty(key) ) {
        edge = this._in_edges[key];
				prevs.push({
          node: edge.getNodes().a,
          edge: edge
        });
			}
		}		
		return prevs;
	}
	
	/**
	 * return the set of all nodes that have
	 * directed edges going out from this node
	 */
	nextNodes() : Array<NeighborEntry> {
		let nexts : Array<NeighborEntry> = [];
		let key 	: string,
				edge 	: $E.IBaseEdge;
		
		for ( key in this._out_edges ) {
			if ( this._out_edges.hasOwnProperty(key) ) {
        edge = this._out_edges[key];
				nexts.push({
          node: edge.getNodes().b,
          edge: edge
        });
			}
		}
		return nexts;
	}
	
	/**
	 * return the set of all nodes that are
	 * connected to this node via undirected edges
	 */
	connNodes() : Array<NeighborEntry> {
		let conns : Array<NeighborEntry> = [];
		let key 	: string,
				edge 	: $E.IBaseEdge;
		
		for ( key in this._und_edges ) {
			if ( this._und_edges.hasOwnProperty(key) ) {
        edge = this._und_edges[key];
				let nodes = edge.getNodes();
				if ( nodes.a === this ) {
					conns.push({
            node: edge.getNodes().b,
            edge: edge
          });
				}
				else {
					conns.push({
            node: edge.getNodes().a,
            edge: edge
          });
				}
			}
		}
		return conns;
	}


	/**
	 * return the set of all nodes 'reachable' from this node,
	 * either via unconnected or outgoing edges
	 *
	 * @param identityFunc can be used to remove 'duplicates' from resulting array,
	 * if necessary
	 * @returns {Array}
	 *
   */
	reachNodes(identityFunc?: Function) : Array<NeighborEntry> {
		let identity = 0;
    return $SU.mergeArrays(
			[ this.nextNodes(), this.connNodes() ],
			identityFunc || ( ne => identity++ )
		);
	}


	/**
	 * return the set of all nodes connected to this node
	 *
	 * @param identityFunc can be used to remove 'duplicates' from resulting array,
	 * if necessary
	 * @returns {Array}
	 *
   */
	allNeighbors(identityFunc?: Function) : Array<NeighborEntry> {
		let identity = 0;
		// console.log(this.nextNodes());
    return $SU.mergeArrays([this.prevNodes(), this.nextNodes(), this.connNodes()],
			identityFunc || function(ne) {return identity++});
	}


	clone() : IBaseNode {
		let new_node = new BaseNode(this._id);
		new_node._label = this._label;
		new_node.setFeatures( $SU.clone( this.getFeatures() ) );
		return new_node;
	}
	
}


export { BaseNode };
